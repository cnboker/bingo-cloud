import React, { useEffect } from 'react'
import { IPageProps } from '../Meta';
import * as CSS from 'csstype'

export const PagePlayer: React.FC<IPageProps> = ({ exit, pageName }) => {
    //下载到设备需要获取本地资源播放
    const style: CSS.Properties = {
        height: '100vh',
        width: '100%'
    }

    useEffect(() => {

    }, []);

    return (
        <div>page</div>
    )
}