import React, { useState, useRef } from "react";
import { RowContainer } from "../../Components/Forms/RowContainer";
import Select from "react-select";
import resources from "../locale";
import { useForm } from "react-hook-form";

export default (props) => {
  const createOption = (val) => {
    return { label: val, value: val };
  };

  const { fanModel, userSensorIds, sensorModel } = props;

  const [sensorId, setSensorId] = useState(createOption(fanModel.sensorId));
  const [name, setName] = useState(fanModel.name);
  const [model, setModel] = useState(createOption(fanModel.model));
 
  let model_HasError = false;
  const nameInput = useRef(null);
  const customStyles = (hasError) => ({
    control: (styles) => ({
      ...styles,
      ...(hasError && { borderColor: "red" }),
    }),
  });

  return (
    <React.Fragment>
      <RowContainer label={resources.sensorId} className="ddl">
        <Select
          isClearable={true}
          
          placeholder={resources.sensorId}
          value={sensorId}
          onChange={(o) => {
            setSensorId(o);

            if (o) {
              fanModel.sensorId = o.value;
            } else {
              setName("");
              fanModel.name="";
              fanModel.sensorId = undefined;
              setModel(o);
            }
          }}
          styles={customStyles(model_HasError)}
          options={userSensorIds.map((x) => {
            return { label: x, value: x };
          })}
        ></Select>
      </RowContainer>
      <RowContainer label={resources.sensorName}>
        <input
          type="text"
          name="name"
          value={name}
          className="form-control-sm"
          ref={nameInput}
          
          onChange={(e) => {
            fanModel.name = e.target.value;
            setName(e.target.value);
          }}
        />
      </RowContainer>
      <RowContainer label={resources.sensorModel} className="ddl">
        <Select
          placeholder={resources.sensorModel}
          value={model}
          onChange={(o) => {
            fanModel.model = o.value;
            setModel(o);
          }}
          styles={customStyles(model_HasError)}
          options={sensorModel
            .toString()
            .split(",")
            .map((x) => {
              return { label: x, value: x };
            })}
        ></Select>
      </RowContainer>
    </React.Fragment>
  );
};
