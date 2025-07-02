export interface EnvironmentVariable {
  key: string
  value: string
  active: boolean
}

export interface GlobalEnvironmentVariable extends EnvironmentVariable {
  secret: boolean
}

export interface SecretVariable {
  key: string
  value: string
  active: boolean
}

export interface Environment {
  name: string
  variables: EnvironmentVariable[]
}

export interface GlobalEnvironment {
  variables: GlobalEnvironmentVariable[]
} 