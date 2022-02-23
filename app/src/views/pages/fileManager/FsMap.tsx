import { FileData } from 'chonky'

export interface FsMap {
  fileMap: CustomFileData
  rootFolderId: string
  bashPath: string
}

// We define a custom interface for file data because we want to add some custom fields
// to Chonky's built-in `FileData` interface.
export interface CustomFileData extends FileData {
  parentId?: string
  childrenIds?: string[]
}

export interface CustomFileMap {
  [fileId: string]: CustomFileData
}
