import { DIContainer } from "@wessberg/di";
import IClientAPI from "../interfaces/IClientAPI";
import { IContentNotify, IContentWorker, IFileDownloader } from "../interfaces/IContentWorker";
import ClientAPI from "./ClientAPI";
import ContentNotify from "./ContentNotify";
import ContentWorker from "./ContentWorker";
import { FileDownloader } from "./FileDownloader";

const container = new DIContainer();

export const serviceRegister = () => {
  container.registerSingleton<IContentNotify, ContentNotify>();
  container.registerSingleton<IFileDownloader, FileDownloader>();
  container.registerSingleton<IClientAPI, ClientAPI>();
  container.registerSingleton<IContentWorker,ContentWorker>();
}

export const getService = <T>() => {
  return container.get<T>();
}