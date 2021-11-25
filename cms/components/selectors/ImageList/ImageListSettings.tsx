import React from 'react'
import { ToolbarSection,ToolbarItem } from 'components/editor'
import { ToolbarDropdown } from '../../editor/Toolbar/ToolbarDropdown'
import { ToolbarTextInput} from '../../editor/Toolbar/ToolbarTextInput'

export const ImageListSettings = ()=>{
  return (
    <React.Fragment>
      <ToolbarSection title="Images">
        <ToolbarItem propKey="imageUrls" type="text" label="Style">
        </ToolbarItem>
      </ToolbarSection>
    </React.Fragment>
  )
}