import { BehaviorSubject } from "rxjs"

export class Store<T> {
  private state: BehaviorSubject<T>

  constructor(initialState: T) {
    this.state = new BehaviorSubject<T>(initialState)
  }

  getValue(): T {
    return this.state.getValue()
  }

  setValue(value: T): void {
    this.state.next(value)
  }

  subscribe(callback: (value: T) => void) {
    return this.state.subscribe(callback)
  }
}
