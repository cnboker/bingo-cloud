
import { connect } from "react-redux";
import { requestPreplay,requestRemotePush } from "./actions";
import Region from "./components/Region";

const mapStateToProps = state =>({
    playerState:state.playerReducer
});

const mapDispatchToProps = (dispatch,ownProps)=>{
    return{
        dispatch,
        requestPreplay: (data) => dispatch(requestPreplay(data)),    
        requestRemotePush:()=>dispatch(requestRemotePush())
    };
};

export default connect(mapStateToProps,mapDispatchToProps)(Region);
// const ReduxWrapperComponent = (props) => {
//     return React.createElement(connect(mapStateToProps,mapDispatchToProps)(props.component))
// }

// export default ReduxWrapperComponent;




