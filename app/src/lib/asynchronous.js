import React from 'react'

/**
 * @typedef {object} State The state of asynchronous hooks.
 * @property {object | null} error The error.
 * @property {boolean} pending Whether the call is pending.
 * @property {any | null} data The result of the asynchronous call.
 */

/** @type {State} */
const initialState = {
  error: null,
  pending: false,
  data: null,
}

/**
 * The reducer of asynchronous hooks.
 *
 * @param {State} state The current state.
 * @param {{ type: string, data?: any, error?: object }} action The action.
 * @returns {State} The new state.
 */
function reducer(state, action) {
  switch (action.type) {
    case 'START': {
      return { ...state, pending: true }
    }
    case 'SUCCESS': {
      return { ...state, pending: false, error: null, data: action.data }
    }
    case 'ERROR':
    default: {
      return { ...state, pending: false, error: action.error }
    }
  }
}

/**
 * @callback AsyncMemoCallback
 * @returns {any} The memoized value.
 */

/**
 * Asynchronous version of `React.useMemo`.
 *
 * @param {AsyncMemoCallback} callback The callback.
 * @param {any[]} [deps] The dependencies.
 * @returns {[any, State]}
 */
export function useAsyncMemo(callback, deps) {
  const [state, dispatch] = React.useReducer(reducer, initialState)

  React.useEffect(
    () => {
      let canceled = false

      async function doWork() {
        dispatch({ type: 'START' })

        try {
          const data = await callback()
          if (!canceled) {
            dispatch({ type: 'SUCCESS', data })
          }
        } catch (error) {
          if (!canceled) {
            dispatch({ type: 'ERROR', error })
          }
        }
      }

      doWork()

      return () => {
        canceled = true
      }
    },
    // We don't add `dispatch` and `callback` to deps to let the caller manage
    // them himself.
    // This is _ok_ as `dispatch` will never change and the latest `callback`
    // will only be used if `deps` changes, which is the behaviour of
    // `React.useMemo`.
    deps,
  )

  return [state.data, state]
}

/**
 * @callback AsyncCallbackCallback
 * @param {...any} args The parameters.
 * @returns {any} A value.
 */

/**
 * Asynchronous version of `React.useCallback`.
 *
 * @param {AsyncCallbackCallback} callback The callback.
 * @param {any[]} [deps] The dependencies.
 * @returns {[AsyncCallbackCallback, State]}
 */
export function useAsyncCallback(callback, deps) {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const cancelPrevious = React.useRef(null)

  const run = React.useCallback(
    async (...args) => {
      if (cancelPrevious.current != null) {
        cancelPrevious.current()
      }

      let canceled = false
      cancelPrevious.current = () => {
        canceled = true
      }

      dispatch({ type: 'START' })

      try {
        const data = await callback(...args)
        if (!canceled) {
          dispatch({ type: 'SUCCESS', data })
        }
      } catch (error) {
        if (!canceled) {
          dispatch({ type: 'ERROR', error })
        }
      }
    },
    // We don't add `dispatch` and `callback` to deps to let the caller manage
    // them himself.
    // This is _ok_ as `dispatch` will never change and the latest `callback`
    // will only be used if `deps` changes, which is the behaviour of
    // `React.useEffect`.
    deps,
  )

  return [run, state]
}
