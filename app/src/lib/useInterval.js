import React from 'react'

export const useInterval = (callback, delay) => {
  const intervalRef = React.useRef()
  const callbackRef = React.useRef(callback)

  // Remember the latest callback:
  //
  // Without this, if you change the callback, when setInterval ticks again, it
  // will still call your old callback.
  //
  // If you add `callback` to useEffect's deps, it will work fine but the interval
  // will be reset.

  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  React.useEffect(() => {
    if (typeof delay === 'number') {
      intervalRef.current = setInterval(() => {
        callbackRef.current()
      }, delay)
      return () => clearInterval(intervalRef.current)
    }
  }, [delay])
  return intervalRef
}
