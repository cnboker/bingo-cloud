import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { IPlayProps } from '../Meta'
import PlayFactory from "./PlayFactory";
import { CSSTrans } from "./CSSTrans";

export type ISeamlessType = {
    horsaProps: IPlayProps,
    hengestProps: IPlayProps,
    next: () => void
}

export const SeamLessPlayer = forwardRef((seamlessProp: ISeamlessType, ref) => {
    const { horsaProps, hengestProps, next } = seamlessProp
    horsaProps.exit = next
    hengestProps.exit = next
    useImperativeHandle(ref, () => ({

    }))

    const Player: React.FC<IPlayProps> = (props) => {
        const {  label, animation, visible, children, ...rest } = props
        //console.log('rest', label, rest)
        return <CSSTrans
            {...{ animation, label, visible, children }}
        >
            <PlayFactory {...rest} />
        </CSSTrans>
    }

    return (
        <React.Fragment>
            <Player {...horsaProps} />
            <Player {...hengestProps} />
        </React.Fragment>
    )
})

