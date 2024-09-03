import { useRef, useState } from 'react'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export const useProcessor = () => {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [hasFiles, setHasFiles] = useState(false)
  const fileInputRef = useRef(null)

  const possibleCodes = ['CODBARRA', 'Código de barras', 'cbarras']
  const possiblePrices = ['PRECIO', 'costo', 'Precio']
  const possibleArtists = ['INTERPRETE', 'artista', 'Artista']
  const possibleAlbums = ['album', 'TITULO', 'Descripción']
  const possibleFormats = ['formato', 'Soporte', 'SOP']
  const possibleLabels = ['SELLO', 'etiqueta', 'Sello']
  const possibleStock = ['STOCK', 'stock', 'Stock']

  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files)
    setFiles(uploadedFiles)
    setHasFiles(uploadedFiles.length > 0)
    setIsDownloaded(false)
  }

  const findKey = (data, possibleKeys) => {
    return possibleKeys.find((key) => key in data)
  }

  const normalizeStock = (stock, color) => {
    if (stock > 0 || stock === '+10') return 'Sí'
    if (!stock && (color === 'FF008000' || color === 'FFFFFF00')) return 'Sí'
    return 'No'
  }

  const processFiles = async () => {
    setIsLoading(true)
    let allData = []
    const codeFileMap = {}

    for (let file of files) {
      const data = await readExcelFile(file)

      const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.')

      const artistKey = findKey(data[0], possibleArtists)
      const albumKey = findKey(data[0], possibleAlbums)
      const formatKey = findKey(data[0], possibleFormats)
      const labelKey = findKey(data[0], possibleLabels)
      const barcodeKey = findKey(data[0], possibleCodes)
      const priceKey = findKey(data[0], possiblePrices)
      const stockKey = findKey(data[0], possibleStock)

      const dataWithFile = data.map((row) => {
        const code = row[barcodeKey]?.value || ''

        if (code) {
          if (!codeFileMap[code]) {
            codeFileMap[code] = new Set()
          }
          codeFileMap[code].add(fileNameWithoutExt)
        }

        return {
          Código: code,
          Artista: row[artistKey]?.value || '',
          Álbum: row[albumKey]?.value || '',
          Formato: row[formatKey]?.value || '',
          Precio: row[priceKey]?.value.toFixed(2) || 0,
          Sello: row[labelKey]?.value || '',
          Proveedor: fileNameWithoutExt,
          Stock: normalizeStock(row[stockKey]?.value, row[stockKey]?.color) || 'No'
        }
      })

      allData = [...allData, ...dataWithFile]
    }

    const groupedData = groupByBarcode(allData)

    let finalData = []

    Object.keys(groupedData).forEach((barcode) => {
      const fileSet = codeFileMap[barcode]

      if (!fileSet) return

      const isInAllFiles = fileSet.size === files.length

      if (isInAllFiles) {
        const hasStock = groupedData[barcode].some((item) => item.Stock === 'Sí')
        if (hasStock) {
          const sortedGroup = groupedData[barcode].sort((a, b) => a.Precio - b.Precio)

          const firstItemWithFormat = sortedGroup.find((item) => item.Formato)
          const formatToAssign = firstItemWithFormat ? firstItemWithFormat.Formato : ''

          const updatedItems = sortedGroup.map((item) => ({
            ...item,
            Formato: formatToAssign
          }))

          finalData = [...finalData, ...updatedItems]
        }
      } else {
        const sortedGroup = groupedData[barcode].sort((a, b) => a.Precio - b.Precio)

        const firstItemWithFormat = sortedGroup.find((item) => item.Formato)
        const formatToAssign = firstItemWithFormat ? firstItemWithFormat.Formato : ''

        const updatedItems = sortedGroup.map((item) => ({
          ...item,
          Formato: formatToAssign
        }))

        finalData = [...finalData, ...updatedItems]
      }
    })

    const getFormatPriority = (format) => {
      const formatLower = format.toLowerCase()

      if (
        formatLower.includes('lp') ||
        formatLower.includes('vin') ||
        formatLower.includes('vinilo') ||
        formatLower.includes('vinyl') ||
        formatLower.includes('vi')
      ) {
        return 1
      }
      if (formatLower.includes('cd')) {
        return 2
      }
      if (
        formatLower.includes('cas') ||
        formatLower.includes('casete') ||
        formatLower.includes('cassette')
      ) {
        return 3
      }
      return 4
    }

    finalData.sort((a, b) => {
      const priorityA = getFormatPriority(a.Formato)
      const priorityB = getFormatPriority(b.Formato)

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      if (a.Formato === b.Formato) {
        if (a.Código === b.Código) {
          return a.Precio - b.Precio
        }

        return a.Código.localeCompare(b.Código)
      }

      return 0
    })

    generateExcel(finalData)
    setIsLoading(false)
    setIsDownloaded(true)
    setFiles([])
    setHasFiles(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const groupByBarcode = (data) => {
    return data.reduce((acc, item) => {
      const barcode = item.Código
      if (!acc[barcode]) {
        acc[barcode] = []
      }
      acc[barcode].push(item)
      return acc
    }, {})
  }

  const readExcelFile = async (file) => {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(file)

      const worksheet = workbook.worksheets[0]
      const data = []

      const headerRow = worksheet.getRow(1)
      const headers = headerRow.values.slice(1)

      const stockIndex = headers.indexOf('Stock') + 1 || null

      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber === 1) return

        const rowData = {}

        if (stockIndex) {
          const cell = row.getCell(stockIndex)
          const cellColor =
            cell.fill && cell.fill.fgColor ? cell.fill.fgColor.argb || cell.fill.fgColor.rgb : null

          rowData['Stock'] = {
            value: cell.value,
            color: cellColor
          }
        }

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1]
          if (header !== 'Stock') {
            rowData[header] = {
              value: cell.value
            }
          }
        })

        data.push(rowData)
      })

      return data
    } catch (error) {
      console.error('Error al leer el archivo:', error)
      return []
    }
  }

  const generateExcel = (finalData) => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Processed Data')

    const headers = [
      { header: 'Código', key: 'Código', width: 20 },
      { header: 'Artista', key: 'Artista', width: 30 },
      { header: 'Álbum', key: 'Álbum', width: 40 },
      { header: 'Formato', key: 'Formato', width: 20 },
      { header: 'Precio', key: 'Precio', width: 15 },
      { header: 'Sello', key: 'Sello', width: 20 },
      { header: 'Proveedor', key: 'Proveedor', width: 20 },
      { header: 'Stock', key: 'Stock', width: 15 }
    ]

    worksheet.columns = headers

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1)
      if (header.header) {
        cell.value = header.header.toUpperCase()
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        }
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          name: 'Arial'
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      }
    })

    finalData.forEach((data) => {
      worksheet.addRow(data)
    })

    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' })
      saveAs(blob, 'processed_catalog.xlsx')
    })
  }

  return {
    hasFiles,
    isLoading,
    isDownloaded,
    fileInputRef,
    processFiles,
    handleFileUpload
  }
}
