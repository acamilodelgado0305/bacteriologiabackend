// Las firmas se guardan como imágenes base64 (varios KB cada una) en registros_diarios.
// El frontend solo necesita saber SI hay firma, no la imagen. Por eso en las lecturas
// omitimos los blobs (que hacían que un SELECT * tardara segundos y agotara el pool de
// conexiones, error P2024) y reponemos un booleano de presencia derivado de la fecha.

const omitirFirmas = { firmaEstudiante: true, firmaDocente: true, firmaBacteriologo: true };

const conPresenciaFirmas = (registro) => {
  if (!registro) return registro;
  return {
    ...registro,
    firmaEstudiante: !!registro.firmaEstudianteFecha,
    firmaDocente: !!registro.firmaDocenteFecha,
    firmaBacteriologo: !!registro.firmaBacteriologoFecha,
  };
};

module.exports = { omitirFirmas, conPresenciaFirmas };
