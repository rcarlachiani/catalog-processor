import { ClipLoader } from 'react-spinners'
import { useProcessor } from '../hooks/useProcessor'
import logo from '../assets/images/ono_logo.webp'

function Processor() {
  const { hasFiles, isLoading, isDownloaded, fileInputRef, processFiles, handleFileUpload } =
    useProcessor()

  return (
    <div className="container flex flex-col justify-center items-center gap-5 max-w-lg">
      <div>
        <img src={logo} alt="musicono logo" width={180} />
      </div>
      <h1 className="text-2xl font-bold text-center">Procesador de Catálogos</h1>
      <div className="flex flex-col justify-center items-center gap-8">
        <p className="text-center text-sm">
          La App realiza un primer ordenamiento de datos por
          <br /> UPC/Código de barras, luego, por cada grupo de códigos,
          <br /> se ordena por precio de menor a mayor, mostrando primero
          <br />
          LPs, CDs, Cassettes y por último los productos sin categorizar.
          <br />
          <br />
          Actualmente, está configurada para procesar los catálogos
          <br />
          de los siguientes proveedores: <span className="font-bold italic">AF</span>,
          <span className="font-bold italic"> DBN</span>, y
          <span className="font-bold italic"> LEF</span>.
          <br />
          <br />
          <span className="font-extrabold text-red-500">IMPORTANTE:</span> <br />
          Los archivos deben estar en formato .xlsx, por lo tanto,
          <br />
          si uno de los archivos es .xls, deberá realizar la conversión
          <br /> individual del archivo en cuestión antes de procesar.
        </p>
        <p className="text-center text-sm">
          Cargue los 3 archivos y oprima
          <span className="font-bold italic"> Procesar y descargar </span>
          <br />
          para obtener un único catálogo unificado y clasificado.
        </p>
      </div>
      <div className="flex flex-col justify-center items-center gap-3 max-w-lg mt-6">
        <input
          type="file"
          multiple
          accept=".xls,.xlsx"
          className="border border-gray-300/50 rounded-md w-full"
          onChange={handleFileUpload}
          ref={fileInputRef} // Asignar la referencia al input
        />
        <button
          className={`rounded-lg p-2 w-full flex items-center justify-center transition-colors duration-300 ${
            isLoading || !hasFiles ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          onClick={processFiles}
          disabled={isLoading || !hasFiles}
        >
          {isLoading ? (
            <>
              <ClipLoader size={20} color={'#fff'} loading={true} />
              <span className="ml-2">Procesando...</span>
            </>
          ) : (
            'Procesar y descargar'
          )}
        </button>
        {isDownloaded && (
          <p className="text-center text-green-600">¡El archivo ha sido descargado con éxito!</p>
        )}
      </div>
    </div>
  )
}

export default Processor
