import { configure } from 'enzyme'
import Adapter from '@wojtekmaj/enzyme-adapter-react-17'

configure({ adapter: new Adapter() })

if (global.document) {
  document.createRange = () => ({
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setStart: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
  })
}
