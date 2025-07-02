import * as E from "fp-ts/Either"
import { entityReference } from "verzod"

import {
  createEnvironment,
  deleteEnvironment,
  environmentsStore,
  getLocalIndexByEnvironmentID,
  replaceEnvironments,
  setGlobalEnvID,
  setGlobalEnvVariables,
  updateEnvironment,
} from "@hoppscotch/common/newstore/environments"
import { authEvents$, def as platformAuth } from "@platform/auth/desktop"

import { runGQLSubscription } from "@hoppscotch/common/helpers/backend/GQLClient"
import { EnvironmentsPlatformDef } from "@hoppscotch/common/src/platform/environments"

import { environnmentsSyncer } from "@platform/environments/desktop/sync"

import { GlobalEnvironment } from "@hoppscotch/data"
import { runDispatchWithOutSyncing } from "@lib/sync"
import {
  createUserGlobalEnvironment,
  getGlobalEnvironments,
  getUserEnvironments,
  runUserEnvironmentCreatedSubscription,
  runUserEnvironmentDeletedSubscription,
  runUserEnvironmentUpdatedSubscription,
} from "./api"

// Add these type declarations at the top of the file
// Minimal type definitions for fp-ts Either
interface Left<E> {
  readonly _tag: 'Left';
  readonly left: E;
}
interface Right<A> {
  readonly _tag: 'Right';
  readonly right: A;
}
type Either<E, A> = Left<E> | Right<A>;

type UserEnvironment = {
  id: string;
  name: string;
  variables: string;
  isGlobal?: boolean;
};

type UserEnvironmentCreatedResponse = {
  userEnvironmentCreated: UserEnvironment;
};

type UserEnvironmentUpdatedResponse = {
  userEnvironmentUpdated: UserEnvironment & { isGlobal: boolean };
};

type UserEnvironmentDeletedResponse = {
  userEnvironmentDeleted: { id: string };
};

type UserEnvironmentsResponse = {
  me: {
    environments: UserEnvironment[];
  };
};

type GlobalEnvironmentsResponse = {
  me: {
    globalEnvironments: UserEnvironment;
  };
};

type CreateGlobalEnvResponse = {
  createUserGlobalEnvironment: {
    id: string;
  };
};

export function initEnvironmentsSync() {
  const currentUser$ = platformAuth.getCurrentUserStream()

  environnmentsSyncer.startStoreSync()
  environnmentsSyncer.setupSubscriptions(setupSubscriptions)

  currentUser$.subscribe(async (user) => {
    if (user) {
      await loadAllEnvironments()
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event === "login" || (event as any).event === "token_refresh") {
      environnmentsSyncer.startListeningToSubscriptions()
    }

    if (event.event === "logout") {
      environnmentsSyncer.stopListeningToSubscriptions()
    }
  })
}

export const def: EnvironmentsPlatformDef = {
  initEnvironmentsSync,
}

function setupSubscriptions() {
  let subs: ReturnType<typeof runGQLSubscription>[1][] = []

  const userEnvironmentCreatedSub = setupUserEnvironmentCreatedSubscription()
  const userEnvironmentUpdatedSub = setupUserEnvironmentUpdatedSubscription()
  const userEnvironmentDeletedSub = setupUserEnvironmentDeletedSubscription()

  subs = [
    userEnvironmentCreatedSub,
    userEnvironmentUpdatedSub,
    userEnvironmentDeletedSub,
  ]

  return () => {
    subs.forEach((sub) => sub.unsubscribe())
  }
}

async function loadUserEnvironments() {
  const res = await getUserEnvironments()

  if (E.isRight(res)) {
    const environments = (res.right as any).me?.environments

    if (environments && environments.length > 0) {
      runDispatchWithOutSyncing(() => {
        replaceEnvironments(
          environments.map(({ id, variables, name }: any) => ({
            v: 1,
            id,
            name,
            variables: JSON.parse(variables),
          }))
        )
      })
    }
  }
}

async function loadGlobalEnvironments() {
  const res = await getGlobalEnvironments()

  if (E.isRight(res)) {
    const globalEnv = (res.right as any).me?.globalEnvironments

    if (globalEnv) {
      const globalEnvVariableEntries = JSON.parse(globalEnv.variables)

      const result = entityReference(GlobalEnvironment).safeParse(
        globalEnvVariableEntries
      )

      runDispatchWithOutSyncing(() => {
        setGlobalEnvVariables(
          result.success ? result.data : globalEnvVariableEntries
        )
        setGlobalEnvID(globalEnv.id)
      })
    }
  } else if (res.left.error == "user_environment/user_env_does_not_exists") {
    const res = await createUserGlobalEnvironment(JSON.stringify([]))

    if (E.isRight(res)) {
      const backendId = (res.right as any).createUserGlobalEnvironment?.id
      if (backendId) {
        setGlobalEnvID(backendId)
      }
    }
  }
}

async function loadAllEnvironments() {
  await loadUserEnvironments()
  await loadGlobalEnvironments()
}

function setupUserEnvironmentCreatedSubscription() {
  const [userEnvironmentCreated$, userEnvironmentCreatedSub] =
    runUserEnvironmentCreatedSubscription()

  userEnvironmentCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { name, variables, id } = (res.right as any).userEnvironmentCreated || {}

      if (name && id) {
        const isAlreadyExisting = environmentsStore.value.environments.some(
          (env: any) => env.id == id
        )

        if (!isAlreadyExisting) {
          runDispatchWithOutSyncing(() => {
            createEnvironment(name, JSON.parse(variables || "[]"), id)
          })
        }
      }
    }
  })

  return userEnvironmentCreatedSub
}

function setupUserEnvironmentUpdatedSubscription() {
  const [userEnvironmentUpdated$, userEnvironmentUpdatedSub] =
    runUserEnvironmentUpdatedSubscription()

  userEnvironmentUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { name, variables, id, isGlobal } = (res.right as any).userEnvironmentUpdated || {}

      if (!id) return

      // handle the case for global environments
      if (isGlobal) {
        runDispatchWithOutSyncing(() => {
          setGlobalEnvVariables(JSON.parse(variables || "[]"))
        })
      } else {
        // handle the case for normal environments

        const localIndex = environmentsStore.value.environments.findIndex(
          (env: any) => env.id == id
        )

        if ((localIndex || localIndex == 0) && name) {
          runDispatchWithOutSyncing(() => {
            updateEnvironment(localIndex, {
              v: 1,
              id,
              name,
              variables: JSON.parse(variables || "[]"),
            })
          })
        }
      }
    }
  })

  return userEnvironmentUpdatedSub
}

function setupUserEnvironmentDeletedSubscription() {
  const [userEnvironmentDeleted$, userEnvironmentDeletedSub] =
    runUserEnvironmentDeletedSubscription()

  userEnvironmentDeleted$.subscribe((res) => {
    if (E.isRight(res)) {
      const { id } = (res.right as any).userEnvironmentDeleted || {}

      if (!id) return

      // TODO: move getLocalIndexByID to a getter in the environmentsStore
      const localIndex = getLocalIndexByEnvironmentID(id)

      if (localIndex || localIndex === 0) {
        runDispatchWithOutSyncing(() => {
          deleteEnvironment(localIndex)
        })
      }
    }
  })

  return userEnvironmentDeletedSub
}
