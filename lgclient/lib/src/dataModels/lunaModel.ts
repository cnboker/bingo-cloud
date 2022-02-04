export interface CallResult {
  returnValue: boolean,
  errorCode: string,
  errorText: string
}

export interface CopyResult extends CallResult {
  progress: number
}

