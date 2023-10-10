import { CButton, CSpinner, CAlert } from '@coreui/react'
import { Box } from '@mui/material'
import { useSelector } from 'react-redux'
import { StatusBarType } from './statusBarReducer'

export default () => {
  const { visible, message, type } = useSelector((state) => state.statusBarReducer)
  if (!visible) return null
  if (type === StatusBarType.progressBar) {
    return <ProgressBar message={message} />
  } else {
    return <MessageBar message={message} barType={type} />
  }
}

const MessageBar = ({ message, barType }) => {
  return <CAlert color={barType === StatusBarType.message ? 'info' : 'warning'}>{message}</CAlert>
}

const ProgressBar = ({ message }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        bgcolor: 'background.paper',
        flexDirection: 'row-reverse',
      }}
    >
      <CButton disabled>
        <CSpinner component="span" size="sm" aria-hidden="true" />
        {message}
      </CButton>
    </Box>
  )
}
