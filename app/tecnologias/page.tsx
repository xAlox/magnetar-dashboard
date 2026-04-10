"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Clock3,
  Layers3,
  Sun,
  Wind,
  Droplets,
  Flame,
  Activity,
} from "lucide-react";

type TecnologiaResumen = {
  id: number;
  payload_hash: string;
  fuente_endpoint: string | null;
  tecnologia: string | null;
  generado: number | null;
  generadoAnt: number | null;
  porcentaje: number | null;
  capturado_en_utc: string | null;
  capturado_en_rd: string | null;
  ultima_actualizacion_texto: string | null;
  ultima_actualizacion_minutos: number | null;
  insertado_en: string | null;
};

type TecnologiaDetalle = {
  id: number;
  payload_hash: string;
  fuente_endpoint: string | null;
  tecnologia: string | null;
  fecha_fuente_texto: string | null;
  fecha_fuente_rd: string | null;
  fecha_fuente_utc: string | null;
  generado: number | null;
  generadoAnt: number | null;
  porcentaje: number | null;
  capturado_en_utc: string | null;
  capturado_en_rd: string | null;
  insertado_en: string | null;
};

const COLORS = {
  navy: "#082B5B",
  navyDark: "#041A33",
  gold: "#D4AF37",
  green: "#16A34A",
  red: "#DC2626",
  amber: "#F59E0B",
  teal: "#0EA5A4",
  sky: "#0284C7",
  bg: "#F5F4F1",
  card: "#FFFFFF",
  border: "#E8E6E1",
  muted: "#6B7280",
  text: "#111827",
};

const TEC_COLORS = ["#082B5B", "#D4AF37", "#0EA5A4", "#0284C7", "#16A34A", "#F59E0B", "#7C3AED", "#DC2626"];

function limpiarTexto(texto: string | null) {
  if (!texto) return "-";

  const fixes: Record<string, string> = {
    "EÃ³lica": "Eólica",
    "HidroelÃ©ctrica": "Hidroeléctrica",
    "TÃ©rmica": "Térmica",
    "Solar Fotovoltaica": "Solar",
  };

  let out = texto;
  Object.entries(fixes).forEach(([mal, bien]) => {
    out = out.replaceAll(mal, bien);
  });

  return out;
}

function formatoNumero(valor: number) {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatoMW(
  valor: number | string | readonly (string | number)[] | undefined
) {
  const limpio = Array.isArray(valor) ? valor[0] : valor;
  return `${formatoNumero(Number(limpio ?? 0))} MW`;
}

function obtenerClaveSnapshot(valor: string | null) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toISOString().slice(0, 16);
}

function cardStyle() {
  return {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 26,
    boxShadow: "0 10px 30px rgba(8, 43, 91, 0.06)",
  } as const;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{ ...cardStyle(), padding: 22, minHeight: 150 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              color: COLORS.muted,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.1,
              fontWeight: 800,
              color: COLORS.text,
              whiteSpace: "pre-line",
            }}
          >
            {value}
          </div>
          {subtitle ? (
            <div style={{ marginTop: 10, color: COLORS.muted, fontSize: 13 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: "rgba(8,43,91,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.navy,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function iconoTecnologia(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes("solar")) return <Sun size={18} />;
  if (n.includes("eólica") || n.includes("eolica")) return <Wind size={18} />;
  if (n.includes("hidro")) return <Droplets size={18} />;
  if (n.includes("térmica") || n.includes("termica")) return <Flame size={18} />;
  return <Layers3 size={18} />;
}

export default function TecnologiasPage() {
  const [resumenRows, setResumenRows] = useState<TecnologiaResumen[]>([]);
  const [detalleRows, setDetalleRows] = useState<TecnologiaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTecnologia, setSelectedTecnologia] = useState("todas");

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 60000);
    return () => clearInterval(interval);
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const [resumenResp, detalleResp] = await Promise.all([
      supabase
        .from("tecnologia_resumen")
        .select("*")
        .order("capturado_en_utc", { ascending: false }),
      supabase
        .from("tecnologia_detalle")
        .select("*")
        .order("capturado_en_utc", { ascending: false }),
    ]);

    if (resumenResp.error) {
      console.error("Error cargando tecnologia_resumen:", resumenResp.error);
    }
    if (detalleResp.error) {
      console.error("Error cargando tecnologia_detalle:", detalleResp.error);
    }

    setResumenRows((resumenResp.data ?? []) as TecnologiaResumen[]);
    setDetalleRows((detalleResp.data ?? []) as TecnologiaDetalle[]);
    setLoading(false);
  }

  const latestSnapshotKey = useMemo(() => {
    if (!resumenRows.length) return "";
    return obtenerClaveSnapshot(resumenRows[0].capturado_en_utc);
  }, [resumenRows]);

  const latestResumen = useMemo(() => {
    if (!latestSnapshotKey) return [];
    return resumenRows.filter(
      (r) => obtenerClaveSnapshot(r.capturado_en_utc) === latestSnapshotKey
    );
  }, [resumenRows, latestSnapshotKey]);

  const latestTimestamp = useMemo(() => {
    if (!latestResumen.length) return null;
    return latestResumen[0].capturado_en_utc;
  }, [latestResumen]);

  const tecnologiasDisponibles = useMemo(() => {
    return [...new Set(resumenRows.map((r) => limpiarTexto(r.tecnologia)))]
      .filter((x) => x && x !== "-")
      .sort((a, b) => a.localeCompare(b));
  }, [resumenRows]);

  const resumenFiltrado = useMemo(() => {
    if (selectedTecnologia === "todas") return latestResumen;
    return latestResumen.filter(
      (r) => limpiarTexto(r.tecnologia) === selectedTecnologia
    );
  }, [latestResumen, selectedTecnologia]);

  const totalGenerado = useMemo(() => {
    return latestResumen.reduce((acc, r) => acc + Number(r.generado ?? 0), 0);
  }, [latestResumen]);

  const tecnologiaTop = useMemo(() => {
    if (!latestResumen.length) return null;
    return [...latestResumen].sort(
      (a, b) => Number(b.generado ?? 0) - Number(a.generado ?? 0)
    )[0];
  }, [latestResumen]);

  const pieData = useMemo(() => {
    return latestResumen.map((r) => ({
      tecnologia: limpiarTexto(r.tecnologia),
      generado: Number(r.generado ?? 0),
    }));
  }, [latestResumen]);

  const barrasData = useMemo(() => {
    return [...resumenFiltrado]
      .sort((a, b) => Number(b.generado ?? 0) - Number(a.generado ?? 0))
      .map((r) => ({
        tecnologia: limpiarTexto(r.tecnologia),
        generado: Number(r.generado ?? 0),
        generadoAnt: Number(r.generadoAnt ?? 0),
      }));
  }, [resumenFiltrado]);

  const historicoTecnologia = useMemo(() => {
    const base =
      selectedTecnologia === "todas"
        ? detalleRows
        : detalleRows.filter(
            (r) => limpiarTexto(r.tecnologia) === selectedTecnologia
          );

    const agrupado = new Map<
      string,
      { fecha: string; generado: number; generadoAnt: number }
    >();

    base.forEach((r) => {
      const clave = r.fecha_fuente_utc ?? r.fecha_fuente_texto ?? "";
      if (!clave) return;

      const actual = agrupado.get(clave) ?? {
        fecha: new Date(clave).toLocaleString("es-DO", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        generado: 0,
        generadoAnt: 0,
      };

      actual.generado += Number(r.generado ?? 0);
      actual.generadoAnt += Number(r.generadoAnt ?? 0);

      agrupado.set(clave, actual);
    });

    return [...agrupado.values()].slice(-30);
  }, [detalleRows, selectedTecnologia]);

  const tablaDetalle = useMemo(() => {
    return [...latestResumen]
      .map((r) => {
        const generado = Number(r.generado ?? 0);
        const generadoAnt = Number(r.generadoAnt ?? 0);
        const delta = generado - generadoAnt;
        const porcentaje = Number(r.porcentaje ?? 0);

        return {
          tecnologia: limpiarTexto(r.tecnologia),
          generado,
          generadoAnt,
          delta,
          porcentaje,
        };
      })
      .sort((a, b) => b.generado - a.generado);
  }, [latestResumen]);

  const ultimaCapturaTexto = useMemo(() => {
    if (!latestTimestamp) return "Sin datos";
    return new Date(latestTimestamp).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }, [latestTimestamp]);

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1600,
        margin: "0 auto",
        background: COLORS.bg,
        minHeight: "100vh",
        color: COLORS.text,
      }}
    >
      <section
        style={{
          padding: 28,
          marginBottom: 24,
          borderRadius: 30,
          background:
            "linear-gradient(135deg, #031A38 0%, #082B5B 58%, #123E78 100%)",
          color: "white",
          boxShadow: "0 18px 45px rgba(8,43,91,0.18)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "white",
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  padding: "10px 14px",
                }}
              >
                <ArrowLeft size={16} />
                Dashboard principal
              </Link>
            </div>

            <h1
              style={{
                margin: "18px 0 0 0",
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              Tecnologías
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                opacity: 0.92,
                fontSize: 17,
              }}
            >
              Mix tecnológico y evolución de generación
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(212,175,55,0.08)",
              color: "white",
              border: "1px solid rgba(212,175,55,0.55)",
              padding: "14px 18px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <Clock3 size={16} />
            {ultimaCapturaTexto}
          </div>
        </div>
      </section>

      <section
        style={{
          ...cardStyle(),
          padding: 18,
          marginBottom: 24,
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: COLORS.navy,
            fontWeight: 700,
          }}
        >
          <Layers3 size={16} />
          Tecnología:
        </div>

        <select
          value={selectedTecnologia}
          onChange={(e) => setSelectedTecnologia(e.target.value)}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            background: "#fff",
            fontSize: 14,
            minWidth: 260,
          }}
        >
          <option value="todas">Todas las tecnologías</option>
          {tecnologiasDisponibles.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <Link
          href="/operaciones"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: COLORS.navy,
            color: "white",
            textDecoration: "none",
            padding: "12px 16px",
            borderRadius: 14,
            fontWeight: 700,
          }}
        >
          Ver operaciones
        </Link>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <KpiCard
          title="Generación total"
          value={`${formatoNumero(totalGenerado)}\nMW`}
          subtitle="Suma de todas las tecnologías"
          icon={<Activity size={20} />}
        />

        <KpiCard
          title="Tecnologías activas"
          value={`${latestResumen.length}`}
          subtitle="Tecnologías reportadas en el snapshot"
          icon={<Layers3 size={20} />}
        />

        <KpiCard
          title="Tecnología líder"
          value={tecnologiaTop ? limpiarTexto(tecnologiaTop.tecnologia) : "-"}
          subtitle={
            tecnologiaTop
              ? `${formatoNumero(Number(tecnologiaTop.generado ?? 0))} MW`
              : ""
          }
          icon={tecnologiaTop ? iconoTecnologia(limpiarTexto(tecnologiaTop.tecnologia)) : <Layers3 size={18} />}
        />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle(), padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Mix por tecnología</h2>
          <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
            Participación relativa del snapshot actual
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="generado"
                nameKey="tecnologia"
                innerRadius={90}
                outerRadius={135}
                paddingAngle={2}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={TEC_COLORS[index % TEC_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatoMW(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle(), padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Comparativo por tecnología</h2>
          <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
            Generado vs generado anterior
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={barrasData}>
              <CartesianGrid strokeDasharray="4 4" stroke="#D9D6CF" />
              <XAxis dataKey="tecnologia" tick={{ fill: "#4B5563", fontSize: 12 }} />
              <YAxis tick={{ fill: "#4B5563", fontSize: 12 }} />
              <Tooltip formatter={(value) => formatoMW(value)} />
              <Legend />
              <Bar dataKey="generadoAnt" fill={COLORS.gold} radius={[6, 6, 0, 0]} />
              <Bar dataKey="generado" fill={COLORS.navy} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={{ ...cardStyle(), padding: 24, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Histórico de tecnología</h2>
        <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
          {selectedTecnologia === "todas"
            ? "Vista consolidada de todas las tecnologías"
            : `Evolución reciente de ${selectedTecnologia}`}
        </p>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={historicoTecnologia}>
            <CartesianGrid strokeDasharray="4 4" stroke="#D9D6CF" />
            <XAxis dataKey="fecha" tick={{ fill: "#4B5563", fontSize: 12 }} />
            <YAxis tick={{ fill: "#4B5563", fontSize: 12 }} />
            <Tooltip formatter={(value) => formatoMW(value)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="generado"
              stroke={COLORS.navy}
              strokeWidth={3}
              dot={false}
              name="Generado"
            />
            <Line
              type="monotone"
              dataKey="generadoAnt"
              stroke={COLORS.gold}
              strokeWidth={2}
              dot={false}
              name="Generado anterior"
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={{ ...cardStyle(), padding: 24, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Detalle por tecnología</h2>
        <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
          Resumen del snapshot actual
        </p>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: `1px solid ${COLORS.border}`,
                  color: COLORS.muted,
                }}
              >
                <th style={{ padding: "12px 10px" }}>Tecnología</th>
                <th style={{ padding: "12px 10px" }}>Generado</th>
                <th style={{ padding: "12px 10px" }}>Anterior</th>
                <th style={{ padding: "12px 10px" }}>Delta MW</th>
                <th style={{ padding: "12px 10px" }}>Var. %</th>
              </tr>
            </thead>
            <tbody>
              {tablaDetalle.map((row) => (
                <tr
                  key={row.tecnologia}
                  style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                    {row.tecnologia}
                  </td>
                  <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                    {formatoNumero(row.generado)}
                  </td>
                  <td style={{ padding: "13px 10px", color: COLORS.muted }}>
                    {formatoNumero(row.generadoAnt)}
                  </td>
                  <td
                    style={{
                      padding: "13px 10px",
                      fontWeight: 800,
                      color: row.delta >= 0 ? COLORS.green : COLORS.red,
                    }}
                  >
                    {row.delta >= 0 ? "+" : ""}
                    {formatoNumero(row.delta)}
                  </td>
                  <td
                    style={{
                      padding: "13px 10px",
                      fontWeight: 800,
                      color: row.porcentaje >= 0 ? COLORS.green : COLORS.red,
                    }}
                  >
                    {row.porcentaje >= 0 ? "+" : ""}
                    {formatoNumero(row.porcentaje)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading && (
        <p style={{ marginTop: 20, color: COLORS.muted }}>Cargando datos...</p>
      )}
    </main>
  );
}
