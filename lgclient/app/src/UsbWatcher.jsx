import { useEffect, useState } from "react";
import { configer, webosApis } from "lgservice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default () => {
    const { getAttachedStorageDeviceList, eject } = webosApis.usbservice;
    const { listFiles, unzipFile, rmdir } = webosApis.webosFileService;
    const { restart } = webosApis.applicationmanager;
    const [deviceNum,
        setDeviceNum] = useState(false);

    useEffect(() => {
        getAttachedStorageDeviceList().then(res => {
            for (var usb of res) {
                console.log("usb info", usb);
                if (usb.storageType === "USB_STORAGE") {
                    const mountName = usb.rootPath + "/sdb1";
                    setDeviceNum(usb.usePortNum);
                    importData(mountName);
                }
            }

        });
    }, []);

    const importData = (path) => {
        listFiles(path).then(fileInfos => {
            return fileInfos
                .files
                .filter(x => {
                    return x.type === "file" && x
                        .name
                        .indexOf(".zipx") > 0;
                })
                .map(x => {
                    return `${path}/${x.name}`;
                });
        }).then(files => {
            console.log("io files", files);
            if (files.length === 0) {
                toast("zip package not exist from usb");
            } else {
                zipFile(files[0]);
            }
        });
    };

    const zipFile = (usbFile) => {
        rmdir(`${configer.ROOT}/downloads`).then(() => {
            return unzipFile(usbFile, `${configer.ROOT}/downloads`);
        }).then(() => {
            toast("Application Update complete. Unplug the U disk and restart the Application....");
            eject(deviceNum);
            return restart();
        }).then(x => {
            console.log("restart success", x);
        }).catch(err => {
            toast(err);
        });
    };

    return (<ToastContainer/> 

    );
};
