import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
//redux hook
import { useDispatch, useSelector } from "react-redux";
import { getDeviceSnapshot } from "../../actions";
import { instanceFetchRequest } from "~/views/Instance/actions";
import { Card } from "~/views/Components/Cards/Card";
import GR from "~/locale";
import { Animate } from "~/components/Animate";

export default (props) => {
  const { deviceInfo } = props;
  const { instance, client } = useSelector((state) => state);

  //same as mapDispatchToProps
  const dispatch = useDispatch();
  let { id } = useParams();

  useEffect(() => {
    //console.log('useEffect 1', instance)
    if (instance.successful) {  
      return;
    }
    dispatch(instanceFetchRequest(client));
  }, [instance,client]);

  useEffect(() => {
   // console.log('useEffect 2', instance)
    if (!instance.successful) return;   
    const interval = setInterval(() => {     
      const { server } = instance.payload;   
      dispatch(getDeviceSnapshot(server, id));
    }, 5000);
    return () => clearInterval(interval);
  }, [instance]);

  const {apiServer } = instance.payload;
  if (!deviceInfo.SpanshotImageUrlObject || !apiServer) {
    return <div>{GR.waitLoading}</div>;
  }
  if ((deviceInfo.value || 2) !== 1) {
    return <div>{GR.offline}</div>;
  }
  return (
    <div>
      <Card headerTitle={deviceInfo.SpanshotImageUrlObject.title}>
        <Animate animation={"pulse"}>
          <img
            style={{ width: "780px" }}
            alt="screen scrap"
            src={`${apiServer}${deviceInfo.SpanshotImageUrlObject.imageUrl}`}
          />
        </Animate>
      </Card>
    </div>
  );
};
