import axios from "axios";

export interface ProgressResult {
  fileName?: string;
  status?: string;
  progress?: number;
  downloaded?: string;
  downloadSpeed?: string;
  remainingTime?: string;
}

export function downloadProcess(
  url: string,
  internalFilePath: string,
  cbProgress: (result: ProgressResult) => void
) {
  var intervalTime = 5000,
    DOWNLOAD_INTERNAL_URL = internalFilePath,
    DOWNLOAD_URL = url,
    TOTAL_FILE_SIZE = 0,
    LOCAL_FILE_SIZE = 0,
    LOCAL_FILE_SIZE_TEMP = 0,
    DOWNLOAD_SPEED = { bytes: 0, mb: 0, kb: 0 },
    REMAIN_TIME = 0;
  var progressResult: ProgressResult = {
    status: "Begin",
    fileName: url.split("/").pop()
  };

  var failureCb = function(cbObject: any) {
    var errorCode = cbObject.errorCode;
    var errorText = cbObject.errorText;
    console.log("downloadProcess Error Code [" + errorCode + "]: " + errorText);
    progressResult.status = "Failure";
    if (timer) {
      clearInterval(timer);
    }
  };

  var timer: any;

  axios.head(DOWNLOAD_URL).then(response => {
    var length = response.headers["content-length"];
    TOTAL_FILE_SIZE = parseInt(length || "0");
    timer = setInterval(updateProgress, intervalTime);
  });

  function updateProgress() {
    LOCAL_FILE_SIZE_TEMP = LOCAL_FILE_SIZE;
    var successCb = function(cbObject: any) {
      LOCAL_FILE_SIZE = parseInt(cbObject.size);

      getDownloadSpeed();
      remainTime();

      progressResult.progress = Math.round(
        (LOCAL_FILE_SIZE / TOTAL_FILE_SIZE) * 100
      );
      if (LOCAL_FILE_SIZE === TOTAL_FILE_SIZE) {
        progressResult.status = "Complete";
      }

      if (progressResult.status === "Complete") {
        if (timer) {
          clearInterval(timer);
        }
      } else {
        progressResult.downloaded = `${(LOCAL_FILE_SIZE / 1024).toFixed(
          0
        )}KB/${(TOTAL_FILE_SIZE / 1024).toFixed(0)}KB(${
          progressResult.progress
        }%)`;

        if (DOWNLOAD_SPEED.mb >= 1)
          progressResult.downloadSpeed = DOWNLOAD_SPEED.mb + " MB/sec";
        else if (DOWNLOAD_SPEED.kb >= 1)
          progressResult.downloadSpeed = DOWNLOAD_SPEED.kb + " KB/sec";
        else progressResult.downloadSpeed = DOWNLOAD_SPEED.bytes + " Bytes/sec";

        progressResult.remainingTime = Math.round(REMAIN_TIME) + " seconds";
      }
      if (cbProgress) {
        cbProgress(progressResult);
      }
    };

    var options = {
      path: DOWNLOAD_INTERNAL_URL
    };

    var storage = new Storage();
    storage.statFile(successCb, failureCb, options);
  }

  function getDownloadSpeed() {
    DOWNLOAD_SPEED.bytes =
      (LOCAL_FILE_SIZE - LOCAL_FILE_SIZE_TEMP) * (1 / (intervalTime / 1000)); // per second
    DOWNLOAD_SPEED.kb = parseFloat((DOWNLOAD_SPEED.bytes / 1024).toFixed(2));
    DOWNLOAD_SPEED.mb = parseFloat((DOWNLOAD_SPEED.kb / 1024).toFixed(2));
  }

  function remainTime() {
    var remain_size = TOTAL_FILE_SIZE - LOCAL_FILE_SIZE;
    var remain_time = remain_size / DOWNLOAD_SPEED.bytes;
    REMAIN_TIME = remain_time;
  }
}
