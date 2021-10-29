import React, { useEffect, useRef } from 'react'

export default ({ columnDefinition, data, ...props }) => {
  console.log('table data', data)
  return (
    <TableContainer>
      <HTMLTable data={data} cellStyles={columnDefinition} {...props}></HTMLTable>
    </TableContainer>
  )
}

const TableContainer = ({ children }) => {
  return <div className="table-responsive">{children}</div>
}

const HTMLTable = ({ cellStyles, data, ...props }) => {
  const tableRef = useRef()
  const [, updateState] = React.useState()
  const forceUpdate = React.useCallback(() => updateState({}), [])

  const calcCellWidth = () => {
    const tableWidth = tableRef.current.offsetWidth
    let fixedWidthSum = 0
    let unfixedWidthCount = cellStyles.length
    for (var c of cellStyles) {
      if (c.width) {
        fixedWidthSum += c.width
        unfixedWidthCount -= 1
      }
    }
    const leftTableWidth = tableWidth - fixedWidthSum
    const unFixedWidth = (1 / unfixedWidthCount) * leftTableWidth
    for (var c of cellStyles) {
      if (!c.width) {
        c.width = unFixedWidth
      }
    }
    forceUpdate()
    //console.log("cellStyles", cellStyles);
  }
  useEffect(() => {
    calcCellWidth()
  }, [cellStyles])

  const windowResize = () => {
    calcCellWidth()
  }

  useEffect(() => {
    window.addEventListener('resize', windowResize)
    return () => window.removeEventListener('resize', windowResize)
  }, [])

  return (
    <React.Fragment>
      <table className="table table-bordered" ref={tableRef}>
        <thead>
          <tr>
            {cellStyles.map((item, index) => {
              var width = cellStyles[index].width
              if (item.visiable === false) return null
              return (
                <th key={index} style={{ width: width + 'px' }}>
                  <span>{item.title}</span>
                </th>
              )
            })}
          </tr>
        </thead>

        <DataTableComponent rows={data} cellStyles={cellStyles} {...props} />
      </table>
    </React.Fragment>
  )
}

const DataTableComponent = ({ cellStyles, rows, ...props }) => {
  return (
    <tbody>
      {rows.map((row, index) => {
        return <DataRowComponent cellStyles={cellStyles} row={row} key={index} {...props} />
      })}
    </tbody>
  )
}

const DataRowComponent = ({ cellStyles, row, ...props }) => {
  return (
    <tr>
      {cellStyles.map((cellStyle, index) => {
        if (cellStyle.visiable === false) return null
        return (
          <td key={index} style={{ width: cellStyle.width - 1 + 'px' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
            {CellRender({ cellStyle, row, ...props })}
          </td>
        )
      })}
    </tr>
  )
}

const CellRender = ({ cellStyle, row, ...props }) => {
  // eslint-disable-next-line no-throw-literal
  if (!cellStyle) throw '表格formatter必须赋值'
  let columnName = cellStyle.columnName
  let Component = cellStyle.formatter
  //console.log('cellRender',columnName,row,Component)
  //let style = cellStyle.style || {}
  if (!Component) {
    return <span>{row[columnName]}</span>
  }
  if (!columnName) {
    return <Component data={row} {...props} />
  }

  return <Component data={row} val={row[columnName]} {...props} />
}
