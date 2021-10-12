import React from 'react';
import {lgs} from 'lgservice';
import config from '../../../config'
export default class LGReadWriter extends React.Component{
    constructor(){
        super();
        this.state = {
            url:''
        }
    }

    read(){
        this.setState({
            url: `${config.REACT_APP_LG_URL}/UploadFiles/file1013/images/7.jpg`
        })
        console.log(`${config.REACT_APP_LG_URL}/UploadFiles/file1013/images/7.jpg`)
    }
   
    write(){
        
        var remoteUrl = "http://ds1.ezdsm.com/UploadFiles/file1013/images/7.jpg";
        var url = require('url')
        var url_parts = url.parse(remoteUrl)        
        lgs.configInstance.fileIOInstance.copyFile(remoteUrl,url_parts.pathname)
    }

    usbunzip(){

    }

    async filelist(){
        var outFiles = [];
        await lgs.configInstance.fileIOInstance.listAllFile('/', outFiles);
        console.log('filelist', outFiles)
    }

    render(){
        return(
            <div>
                <img src={this.state.url}/>
                <button className="btn-primary" onClick={this.write.bind(this)}>write file</button>
                <button className="btn-secondary" onClick={this.read.bind(this)}>read file</button>
                <button className="btn-secondary" onClick={this.usbunzip.bind(this)}>usb unzip</button>
                <button className="btn-secondary" onClick={this.filelist.bind(this)}>file list</button>
            </div>
        )
    }
}