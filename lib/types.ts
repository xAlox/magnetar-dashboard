export type GeneracionPlanta = {
  id: number;
  payload_hash: string;
  fuente_endpoint: string | null;
  central: string | null;
  generado: number | null;
  generadoAnt: number | null;
  porcentaje: number | null;
  grupo: string | null;
  tipo_fuente: string | null;
  capturado_en_utc: string | null;
  capturado_en_rd: string | null;
  ultima_actualizacion_texto: string | null;
  ultima_actualizacion_minutos: number | null;
  insertado_en: string | null;
};
