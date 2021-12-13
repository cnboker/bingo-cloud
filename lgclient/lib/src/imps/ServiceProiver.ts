import ClientAPI from "./ClientAPI";
import ContentNotify from "./ContentNotify";
import ContentWorker from "./ContentWorker";
import { FileDownloader } from "./FileDownloader";
import { MQTTDispatcher } from "./MQTTDispatcher";

class DIContainer<T , U> {
  private map: Map<T, U>;

  constructor() {
    this.map = new Map<T, U>();
  }
  get(key: T): U | undefined {
    return this.map.get(key);
  }
  registerSingleton(t: T, u: { new(): U }): void {
    this.map.set(t, new u());
  }
}

const container = new DIContainer();

export const serviceRegister = () => {
  container.registerSingleton("IContentNotify", ContentNotify);
  container.registerSingleton("IFileDownloader", FileDownloader);
  container.registerSingleton("IClientAPI",ClientAPI);
  container.registerSingleton("IContentWorker",ContentWorker);
  container.registerSingleton('IMQTTDispatcher',MQTTDispatcher)
}

export const getService = (key:string) => {
  return container.get(key);
}

