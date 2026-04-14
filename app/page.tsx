"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GeneracionPlanta } from "@/lib/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Clock3,
  Zap,
  Factory,
  Leaf,
  Flame,
  Trophy,
  Search,
  LineChart as LineChartIcon,
} from "lucide-react";

const COLORS = {
  navy: "#082B5B",
  navyDark: "#041A33",
  navySoft: "#123E78",
  gold: "#D4AF37",
  goldSoft: "#E7C85C",
  bg: "#F5F4F1",
  card: "#FFFFFF",
  border: "#E8E6E1",
  muted: "#6B7280",
  text: "#111827",
  green: "#16A34A",
  red: "#DC2626",
};

function limpiarTexto(texto: string | null) {
  if (!texto) return "-";

  const fixes: Record<string, string> = {
    "EÃ³lica": "Eólica",
    "HidroelÃ©ctrica": "Hidroeléctrica",
    "TÃ©rmica": "Térmica",
    "MartÃ­": "Martí",
    "RÃO": "RÍO",
    "RÃ­o": "Río",
    "MonciÃ³n": "Monción",
    "LÃ³pez": "López",
    "BarÃ­as": "Barías",
    "CotoperÃ­": "Cotoperí",
    "AndrÃ©s": "Andrés",
    "OrÃ­genes": "Orígenes",
    "CarbÃ³n": "Carbón",
    "COSTERA": "COASTAL",
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
  const num = Number(limpio ?? 0);
  return `${formatoNumero(num)} MW`;
}

function normalizarTipoFuente(valor: string | null) {
  const v = (valor ?? "").trim().toLowerCase();

  if (v === "renovable") return "renovable";
  if (v === "norenovable") return "noRenovable";
  if (v === "no renovable") return "noRenovable";
  if (v === "no_renovable") return "noRenovable";
  if (v === "no-renovable") return "noRenovable";

  return valor ?? "";
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

function botonFiltroStyle(activo: boolean) {
  return {
    border: activo ? "1px solid rgba(212,175,55,0.65)" : `1px solid ${COLORS.border}`,
    background: activo ? "rgba(212,175,55,0.12)" : "#FFFFFF",
    color: activo ? COLORS.navy : COLORS.text,
    padding: "10px 16px",
    borderRadius: 999,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as const;
}

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    background: "#fff",
    fontSize: 14,
    outline: "none",
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

export default function HomePage() {
  const [rows, setRows] = useState<GeneracionPlanta[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTipo, setSelectedTipo] = useState("todos");
  const [grupoFiltro, setGrupoFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [selectedCentral, setSelectedCentral] = useState("");

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 60000);
    return () => clearInterval(interval);
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("generacion_plantas")
      .select("*")
      .order("capturado_en_utc", { ascending: false });

    if (error) {
      console.error("Error cargando datos:", error);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as GeneracionPlanta[]);
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

    const ordenadas = [...latestRows].sort(
      (a, b) =>
        new Date(b.capturado_en_utc ?? 0).getTime() -
        new Date(a.capturado_en_utc ?? 0).getTime()
    );

    return ordenadas[0].capturado_en_utc;
  }, [latestRows]);

  const gruposDisponibles = useMemo(() => {
    const unicos = [...new Set(latestRows.map((r) => limpiarTexto(r.grupo)))].filter(
      (x) => x && x !== "-"
    );
    return unicos.sort((a, b) => a.localeCompare(b));
  }, [latestRows]);

  const centralesDisponibles = useMemo(() => {
    const unicas = [...new Set(rows.map((r) => limpiarTexto(r.central)))].filter(
      (x) => x && x !== "-"
    );
    return unicas.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    if (!selectedCentral && centralesDisponibles.length > 0) {
      setSelectedCentral(centralesDisponibles[0]);
    }
  }, [centralesDisponibles, selectedCentral]);

  const filteredRows = useMemo(() => {
    return latestRows.filter((r) => {
      const tipoOk =
        selectedTipo === "todos" ||
        normalizarTipoFuente(r.tipo_fuente) === selectedTipo;

      const grupoOk =
        grupoFiltro === "todos" || limpiarTexto(r.grupo) === grupoFiltro;

      const centralTexto = limpiarTexto(r.central).toLowerCase();
      const busquedaOk =
        busqueda.trim() === "" ||
        centralTexto.includes(busqueda.trim().toLowerCase());

      return tipoOk && grupoOk && busquedaOk;
    });
  }, [latestRows, selectedTipo, grupoFiltro, busqueda]);

  const kpis = useMemo(() => {
    const total = latestRows.reduce((acc, r) => acc + Number(r.generado ?? 0), 0);

    const renovable = latestRows
      .filter((r) => normalizarTipoFuente(r.tipo_fuente) === "renovable")
      .reduce((acc, r) => acc + Number(r.generado ?? 0), 0);

    const noRenovable = latestRows
      .filter((r) => normalizarTipoFuente(r.tipo_fuente) === "noRenovable")
      .reduce((acc, r) => acc + Number(r.generado ?? 0), 0);

    const activos = filteredRows.filter((r) => Number(r.generado ?? 0) > 0).length;

    return { total, renovable, noRenovable, activos };
  }, [filteredRows, latestRows]);

  const topActivos = useMemo(() => {
    return [...filteredRows]
      .filter((r) => Number(r.generado ?? 0) > 0)
      .sort((a, b) => Number(b.generado ?? 0) - Number(a.generado ?? 0))
      .slice(0, 10)
      .map((r) => ({
        central: limpiarTexto(r.central),
        generado: Number(r.generado ?? 0),
      }));
  }, [filteredRows]);

  const topTabla = useMemo(() => {
    return [...filteredRows]
      .filter((r) => Number(r.generado ?? 0) > 0)
      .sort((a, b) => Number(b.generado ?? 0) - Number(a.generado ?? 0))
      .slice(0, 20);
  }, [filteredRows]);

  const mayoresCambios = useMemo(() => {
    return [...filteredRows]
      .map((r) => ({
        central: limpiarTexto(r.central),
        grupo: limpiarTexto(r.grupo),
        delta: Number(r.generado ?? 0) - Number(r.generadoAnt ?? 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);
  }, [filteredRows]);

  const mixData = useMemo(() => {
    return [
      { name: "Renovable", value: kpis.renovable },
      { name: "No renovable", value: kpis.noRenovable },
    ];
  }, [kpis]);

  const mayorActivo = useMemo(() => {
    if (!latestRows.length) return null;
    return [...latestRows].sort(
      (a, b) => Number(b.generado ?? 0) - Number(a.generado ?? 0)
    )[0];
  }, [latestRows]);

  const historicoCentral = useMemo(() => {
    if (!selectedCentral) return [];

    const filtradas = rows
      .filter((r) => limpiarTexto(r.central) === selectedCentral)
      .sort(
        (a, b) =>
          new Date(a.capturado_en_utc ?? 0).getTime() -
          new Date(b.capturado_en_utc ?? 0).getTime()
      );

    const compactadas = filtradas.map((r) => ({
      fecha: new Date(r.capturado_en_utc ?? "").toLocaleString("es-DO", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      generado: Number(r.generado ?? 0),
      generadoAnt: Number(r.generadoAnt ?? 0),
    }));

    return compactadas.slice(-30);
  }, [rows, selectedCentral]);

  const ultimaCapturaTexto = useMemo(() => {
    if (!latestTimestamp) return "Sin datos";
    return new Date(latestTimestamp).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }, [latestTimestamp]);

  const porcentajeRenovable =
    kpis.total > 0 ? ((kpis.renovable / kpis.total) * 100).toFixed(1) : "0.0";

  const porcentajeNoRenovable =
    kpis.total > 0 ? ((kpis.noRenovable / kpis.total) * 100).toFixed(1) : "0.0";

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
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div
              style={{
                width: 94,
                height: 94,
                borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Image
                src="/magnetar-logo.png"
                alt="Magnetar Global Partners"
                width={70}
                height={70}
                priority
              />
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Magnetar Global Partners
              </h1>
              <p
                style={{
                  margin: "10px 0 0 0",
                  opacity: 0.92,
                  fontSize: 17,
                }}
              >
                Energy Asset Monitoring Dashboard
              </p>
            </div>
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
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr auto",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: 13,
              color: COLORS.muted,
            }}
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar central..."
            style={{ ...inputStyle(), paddingLeft: 36 }}
          />
        </div>

        <select
          value={grupoFiltro}
          onChange={(e) => setGrupoFiltro(e.target.value)}
          style={inputStyle()}
        >
          <option value="todos">Todos los grupos</option>
          {gruposDisponibles.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={selectedCentral}
          onChange={(e) => setSelectedCentral(e.target.value)}
          style={inputStyle()}
        >
          {centralesDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/operaciones"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: COLORS.navy,
              color: "white",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 14,
              fontWeight: 700,
              minHeight: 46,
              whiteSpace: "nowrap",
            }}
          >
            Ver operaciones
          </Link>

          <Link
            href="/tecnologias"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: COLORS.gold,
              color: COLORS.navyDark,
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 14,
              fontWeight: 700,
              minHeight: 46,
              whiteSpace: "nowrap",
            }}
          >
            Ver tecnologías
          </Link>

          <Link
            href="/coastal"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "#0F766E",
              color: "white",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 14,
              fontWeight: 700,
              minHeight: 46,
              whiteSpace: "nowrap",
            }}
          >
            Coastal
          </Link>

          <Link
            href="/marti"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "#7C3AED",
              color: "white",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: 14,
              fontWeight: 700,
              minHeight: 46,
              whiteSpace: "nowrap",
            }}
          >
            Martí
          </Link>
        </div>
      </section>

      <section
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setSelectedTipo("todos")}
          style={botonFiltroStyle(selectedTipo === "todos")}
        >
          Todo
        </button>
        <button
          onClick={() => setSelectedTipo("renovable")}
          style={botonFiltroStyle(selectedTipo === "renovable")}
        >
          Renovables
        </button>
        <button
          onClick={() => setSelectedTipo("noRenovable")}
          style={botonFiltroStyle(selectedTipo === "noRenovable")}
        >
          No renovables
        </button>
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
          value={`${formatoNumero(kpis.total)}\nMW`}
          subtitle="Snapshot más reciente del portafolio"
          icon={<Zap size={20} />}
        />

        <KpiCard
          title="Renovable"
          value={`${formatoNumero(kpis.renovable)}\nMW`}
          subtitle={`${porcentajeRenovable}% del total`}
          icon={<Leaf size={20} />}
        />

        <KpiCard
          title="No renovable"
          value={`${formatoNumero(kpis.noRenovable)}\nMW`}
          subtitle={`${porcentajeNoRenovable}% del total`}
          icon={<Flame size={20} />}
        />

        <KpiCard
          title="Activos generando"
          value={`${kpis.activos}`}
          subtitle="Activos con generación > 0"
          icon={<Factory size={20} />}
        />

        <KpiCard
          title="Mayor activo"
          value={mayorActivo ? limpiarTexto(mayorActivo.central) : "-"}
          subtitle={
            mayorActivo ? `${formatoNumero(Number(mayorActivo.generado ?? 0))} MW` : ""
          }
          icon={<Trophy size={20} />}
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
        <div style={{ ...cardStyle(), padding: 24, minHeight: 430 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Mix del portafolio</h2>
              <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 13 }}>
                Participación renovable y no renovable
              </p>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.navy,
                background: "rgba(8,43,91,0.06)",
                padding: "8px 10px",
                borderRadius: 999,
              }}
            >
              Total: {formatoNumero(kpis.total)} MW
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={mixData}
                dataKey="value"
                nameKey="name"
                innerRadius={90}
                outerRadius={135}
                paddingAngle={2}
              >
                <Cell fill={COLORS.gold} />
                <Cell fill={COLORS.navy} />
              </Pie>
              <Tooltip formatter={(value) => formatoMW(value)} />
            </PieChart>
          </ResponsiveContainer>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 8,
            }}
          >
            <div
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>
                Renovable
              </div>
              <div style={{ fontWeight: 800, color: COLORS.gold, fontSize: 20 }}>
                {formatoNumero(kpis.renovable)} MW
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>
                No renovable
              </div>
              <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 20 }}>
                {formatoNumero(kpis.noRenovable)} MW
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle(), padding: 24, minHeight: 430 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Top activos por generación</h2>
            <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 13 }}>
              Ranking del snapshot actual
            </p>
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topActivos} layout="vertical" margin={{ left: 25 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#D9D6CF" />
              <XAxis type="number" tick={{ fill: "#4B5563", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="central"
                width={220}
                tick={{ fill: "#4B5563", fontSize: 12 }}
              />
              <Tooltip formatter={(value) => formatoMW(value)} />
              <Bar dataKey="generado" fill={COLORS.navy} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle(), padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Detalle de activos</h2>
            <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 13 }}>
              Top 20 activos filtrados
            </p>
          </div>

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
                  <th style={{ padding: "12px 10px" }}>Activo</th>
                  <th style={{ padding: "12px 10px" }}>Grupo</th>
                  <th style={{ padding: "12px 10px" }}>Tipo</th>
                  <th style={{ padding: "12px 10px" }}>Generado</th>
                  <th style={{ padding: "12px 10px" }}>Anterior</th>
                  <th style={{ padding: "12px 10px" }}>Var. %</th>
                </tr>
              </thead>
              <tbody>
                {topTabla.map((row) => {
                  const porcentaje = Number(row.porcentaje ?? 0);
                  return (
                    <tr
                      key={`${row.central}-${row.capturado_en_utc}`}
                      style={{ borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                        {limpiarTexto(row.central)}
                      </td>
                      <td style={{ padding: "13px 10px", color: COLORS.muted }}>
                        {limpiarTexto(row.grupo)}
                      </td>
                      <td style={{ padding: "13px 10px", color: COLORS.muted }}>
                        {normalizarTipoFuente(row.tipo_fuente) === "renovable"
                          ? "Renovable"
                          : "No renovable"}
                      </td>
                      <td style={{ padding: "13px 10px", fontWeight: 700 }}>
                        {formatoNumero(Number(row.generado ?? 0))}
                      </td>
                      <td style={{ padding: "13px 10px", color: COLORS.muted }}>
                        {formatoNumero(Number(row.generadoAnt ?? 0))}
                      </td>
                      <td
                        style={{
                          padding: "13px 10px",
                          fontWeight: 800,
                          color: porcentaje >= 0 ? COLORS.green : COLORS.red,
                        }}
                      >
                        {porcentaje >= 0 ? "+" : ""}
                        {formatoNumero(porcentaje)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...cardStyle(), padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Mayores movimientos</h2>
            <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 13 }}>
              Variación MW vs período anterior
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {mayoresCambios.map((item) => (
              <div
                key={`${item.central}-${item.delta}`}
                style={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 18,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{item.central}</div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>
                    {item.grupo}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: 900,
                    color: item.delta >= 0 ? COLORS.green : COLORS.red,
                    whiteSpace: "nowrap",
                    fontSize: 16,
                  }}
                >
                  {item.delta >= 0 ? "+" : ""}
                  {formatoNumero(item.delta)} MW
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle(), padding: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>
              Histórico del activo seleccionado
            </h2>
            <p style={{ margin: "6px 0 0 0", color: COLORS.muted, fontSize: 13 }}>
              Evolución reciente de {selectedCentral || "la central seleccionada"}
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: COLORS.navy,
              background: "rgba(8,43,91,0.06)",
              borderRadius: 999,
              padding: "10px 12px",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            <LineChartIcon size={16} />
            Últimos 30 registros
          </div>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={historicoCentral}>
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

      {loading && (
        <p style={{ marginTop: 20, color: COLORS.muted }}>Cargando datos...</p>
      )}
    </main>
  );
}