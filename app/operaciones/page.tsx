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
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Clock3,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Activity,
  Target,
} from "lucide-react";

type ProgramadoVsEjecutado = {
  id: number;
  payload_hash: string;
  fuente_endpoint: string | null;
  grupo: string | null;
  indice: number | null;
  fecha_fuente_texto: string | null;
  fecha_fuente_rd: string | null;
  fecha_fuente_utc: string | null;
  generado: number | null;
  programado: number | null;
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
  bg: "#F5F4F1",
  card: "#FFFFFF",
  border: "#E8E6E1",
  muted: "#6B7280",
  text: "#111827",
};

function cardStyle() {
  return {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 26,
    boxShadow: "0 10px 30px rgba(8, 43, 91, 0.06)",
  } as const;
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

export default function OperacionesPage() {
  const [rows, setRows] = useState<ProgramadoVsEjecutado[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoFiltro, setGrupoFiltro] = useState("todos");

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 60000);
    return () => clearInterval(interval);
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("programado_vs_ejecutado")
      .select("*")
      .order("capturado_en_utc", { ascending: false });

    if (error) {
      console.error("Error cargando PVE:", error);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as ProgramadoVsEjecutado[]);
    setLoading(false);
  }

  const latestSnapshotKey = useMemo(() => {
    if (!rows.length) return "";
    return obtenerClaveSnapshot(rows[0].capturado_en_utc);
  }, [rows]);

  const latestRows = useMemo(() => {
    if (!latestSnapshotKey) return [];
    return rows.filter(
      (r) => obtenerClaveSnapshot(r.capturado_en_utc) === latestSnapshotKey
    );
  }, [rows, latestSnapshotKey]);

  const latestTimestamp = useMemo(() => {
    if (!latestRows.length) return null;
    return latestRows[0].capturado_en_utc;
  }, [latestRows]);

  const gruposDisponibles = useMemo(() => {
    const unicos = [...new Set(latestRows.map((r) => r.grupo ?? "-"))].filter(
      (g) => g && g !== "-"
    );
    return unicos.sort((a, b) => a.localeCompare(b));
  }, [latestRows]);

  const filteredRows = useMemo(() => {
    if (grupoFiltro === "todos") return latestRows;
    return latestRows.filter((r) => (r.grupo ?? "") === grupoFiltro);
  }, [latestRows, grupoFiltro]);

  const resumen = useMemo(() => {
    const totalProgramado = filteredRows.reduce(
      (acc, r) => acc + Number(r.programado ?? 0),
      0
    );
    const totalEjecutado = filteredRows.reduce(
      (acc, r) => acc + Number(r.generado ?? 0),
      0
    );
    const desvio = totalEjecutado - totalProgramado;
    const cumplimiento =
      totalProgramado > 0 ? (totalEjecutado / totalProgramado) * 100 : 0;

    return {
      totalProgramado,
      totalEjecutado,
      desvio,
      cumplimiento,
    };
  }, [filteredRows]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<
      string,
      { grupo: string; programado: number; ejecutado: number; desvio: number }
    >();

    latestRows.forEach((r) => {
      const grupo = r.grupo ?? "Sin grupo";
      const actual = mapa.get(grupo) ?? {
        grupo,
        programado: 0,
        ejecutado: 0,
        desvio: 0,
      };

      actual.programado += Number(r.programado ?? 0);
      actual.ejecutado += Number(r.generado ?? 0);
      actual.desvio = actual.ejecutado - actual.programado;

      mapa.set(grupo, actual);
    });

    return [...mapa.values()].sort((a, b) => b.ejecutado - a.ejecutado);
  }, [latestRows]);

  const historicoGrupo = useMemo(() => {
    const base = grupoFiltro === "todos" ? rows : rows.filter((r) => r.grupo === grupoFiltro);

    const agrupado = new Map<
      string,
      { fecha: string; programado: number; ejecutado: number }
    >();

    base.forEach((r) => {
      const clave = obtenerClaveSnapshot(r.capturado_en_utc);
      const actual = agrupado.get(clave) ?? {
        fecha: new Date(r.capturado_en_utc ?? "").toLocaleString("es-DO", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        programado: 0,
        ejecutado: 0,
      };

      actual.programado += Number(r.programado ?? 0);
      actual.ejecutado += Number(r.generado ?? 0);

      agrupado.set(clave, actual);
    });

    return [...agrupado.values()].slice(-30);
  }, [rows, grupoFiltro]);

  const tablaDetalle = useMemo(() => {
    return [...filteredRows]
      .map((r) => {
        const programado = Number(r.programado ?? 0);
        const ejecutado = Number(r.generado ?? 0);
        const desvio = ejecutado - programado;
        const cumplimiento = programado > 0 ? (ejecutado / programado) * 100 : 0;

        return {
          ...r,
          programado,
          ejecutado,
          desvio,
          cumplimiento,
        };
      })
      .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));
  }, [filteredRows]);

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
              Operaciones y Cumplimiento
            </h1>
            <p
              style={{
                margin: "10px 0 0 0",
                opacity: 0.92,
                fontSize: 17,
              }}
            >
              Programado vs ejecutado por período operativo
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
          <CalendarDays size={16} />
          Grupo:
        </div>

        <select
          value={grupoFiltro}
          onChange={(e) => setGrupoFiltro(e.target.value)}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            background: "#fff",
            fontSize: 14,
            minWidth: 220,
          }}
        >
          <option value="todos">Todos los grupos</option>
          {gruposDisponibles.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
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
          title="Programado total"
          value={`${formatoNumero(resumen.totalProgramado)}\nMW`}
          subtitle="Suma del grupo filtrado"
          icon={<Target size={20} />}
        />
        <KpiCard
          title="Ejecutado total"
          value={`${formatoNumero(resumen.totalEjecutado)}\nMW`}
          subtitle="Generación observada"
          icon={<Activity size={20} />}
        />
        <KpiCard
          title="Desviación"
          value={`${resumen.desvio >= 0 ? "+" : ""}${formatoNumero(
            resumen.desvio
          )}\nMW`}
          subtitle="Ejecutado - Programado"
          icon={<BarChart3 size={20} />}
        />
        <KpiCard
          title="Cumplimiento"
          value={`${formatoNumero(resumen.cumplimiento)}%`}
          subtitle="Ejecutado / Programado"
          icon={<Target size={20} />}
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
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Programado vs ejecutado por grupo</h2>
          <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
            Snapshot actual consolidado
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={porGrupo}>
              <CartesianGrid strokeDasharray="4 4" stroke="#D9D6CF" />
              <XAxis dataKey="grupo" tick={{ fill: "#4B5563", fontSize: 12 }} />
              <YAxis tick={{ fill: "#4B5563", fontSize: 12 }} />
              <Tooltip formatter={(value) => formatoMW(value)} />
              <Legend />
              <Bar dataKey="programado" fill={COLORS.gold} radius={[6, 6, 0, 0]} />
              <Bar dataKey="ejecutado" fill={COLORS.navy} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle(), padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Histórico de cumplimiento</h2>
          <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
            Últimos 30 registros del grupo seleccionado
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={historicoGrupo}>
              <CartesianGrid strokeDasharray="4 4" stroke="#D9D6CF" />
              <XAxis dataKey="fecha" tick={{ fill: "#4B5563", fontSize: 12 }} />
              <YAxis tick={{ fill: "#4B5563", fontSize: 12 }} />
              <Tooltip formatter={(value) => formatoMW(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="programado"
                stroke={COLORS.gold}
                strokeWidth={3}
                dot={false}
                name="Programado"
              />
              <Line
                type="monotone"
                dataKey="ejecutado"
                stroke={COLORS.navy}
                strokeWidth={3}
                dot={false}
                name="Ejecutado"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={{ ...cardStyle(), padding: 24, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Detalle operativo</h2>
        <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
          Registros ordenados por mayor desviación absoluta
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
                <th style={{ padding: "12px 10px" }}>Grupo</th>
                <th style={{ padding: "12px 10px" }}>Fecha fuente</th>
                <th style={{ padding: "12px 10px" }}>Programado</th>
                <th style={{ padding: "12px 10px" }}>Ejecutado</th>
                <th style={{ padding: "12px 10px" }}>Desvío</th>
                <th style={{ padding: "12px 10px" }}>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {tablaDetalle.map((row) => (
                <tr
                  key={`${row.grupo}-${row.fecha_fuente_texto}-${row.id}`}
                  style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                    {row.grupo ?? "-"}
                  </td>
                  <td style={{ padding: "13px 10px", color: COLORS.muted }}>
                    {row.fecha_fuente_texto ?? "-"}
                  </td>
                  <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                    {formatoNumero(row.programado)}
                  </td>
                  <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                    {formatoNumero(row.ejecutado)}
                  </td>
                  <td
                    style={{
                      padding: "13px 10px",
                      fontWeight: 800,
                      color: row.desvio >= 0 ? COLORS.green : COLORS.red,
                    }}
                  >
                    {row.desvio >= 0 ? "+" : ""}
                    {formatoNumero(row.desvio)}
                  </td>
                  <td
                    style={{
                      padding: "13px 10px",
                      fontWeight: 800,
                      color:
                        row.cumplimiento >= 100
                          ? COLORS.green
                          : row.cumplimiento >= 95
                          ? COLORS.amber
                          : COLORS.red,
                    }}
                  >
                    {formatoNumero(row.cumplimiento)}%
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