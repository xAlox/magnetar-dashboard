"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GeneracionPlanta } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { ArrowLeft, Clock3, Sun, TrendingUp, Activity, BarChart3 } from "lucide-react";

const COLORS = {
  navy: "#082B5B",
  navyDark: "#041A33",
  gold: "#D4AF37",
  green: "#16A34A",
  red: "#DC2626",
  bg: "#F5F4F1",
  card: "#FFFFFF",
  border: "#E8E6E1",
  muted: "#6B7280",
  text: "#111827",
};

const CENTRAL_OBJETIVO = "PARQUE FOTOVOLTAICO MARTÍ";

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

function limpiarTexto(texto: string | null) {
  if (!texto) return "-";

  const fixes: Record<string, string> = {
    "MartÃ­": "Martí",
    "EÃ³lica": "Eólica",
    "HidroelÃ©ctrica": "Hidroeléctrica",
    "TÃ©rmica": "Térmica",
  };

  let out = texto;
  Object.entries(fixes).forEach(([mal, bien]) => {
    out = out.replaceAll(mal, bien);
  });

  return out;
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 10, fontWeight: 600 }}>
            {title}
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: COLORS.text }}>
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

export default function MartiPage() {
  const [rows, setRows] = useState<GeneracionPlanta[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error("Error cargando Martí:", error);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as GeneracionPlanta[]);
    setLoading(false);
  }

  const martiRows = useMemo(() => {
    return rows.filter((r) => limpiarTexto(r.central) === CENTRAL_OBJETIVO);
  }, [rows]);

  const latestSnapshotKey = useMemo(() => {
    if (!martiRows.length) return "";
    return obtenerClaveSnapshot(martiRows[0].capturado_en_utc);
  }, [martiRows]);

  const latestRow = useMemo(() => {
    if (!latestSnapshotKey) return null;
    const fila = martiRows.find(
      (r) => obtenerClaveSnapshot(r.capturado_en_utc) === latestSnapshotKey
    );
    return fila ?? null;
  }, [martiRows, latestSnapshotKey]);

  const historico = useMemo(() => {
    return [...martiRows]
      .sort(
        (a, b) =>
          new Date(a.capturado_en_utc ?? 0).getTime() -
          new Date(b.capturado_en_utc ?? 0).getTime()
      )
      .map((r) => ({
        fecha: new Date(r.capturado_en_utc ?? "").toLocaleString("es-DO", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        generado: Number(r.generado ?? 0),
        generadoAnt: Number(r.generadoAnt ?? 0),
        porcentaje: Number(r.porcentaje ?? 0),
      }))
      .slice(-40);
  }, [martiRows]);

  const ultimaCapturaTexto = useMemo(() => {
    if (!latestRow?.capturado_en_utc) return "Sin datos";
    return new Date(latestRow.capturado_en_utc).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }, [latestRow]);

  const deltaMW =
    Number(latestRow?.generado ?? 0) - Number(latestRow?.generadoAnt ?? 0);

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1500,
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
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
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

            <h1 style={{ margin: "18px 0 0 0", fontSize: 34, fontWeight: 900 }}>
              Martí
            </h1>
            <p style={{ margin: "10px 0 0 0", opacity: 0.92, fontSize: 17 }}>
              PARQUE FOTOVOLTAICO MARTÍ
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
              height: "fit-content",
            }}
          >
            <Clock3 size={16} />
            {ultimaCapturaTexto}
          </div>
        </div>
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
          title="Generación actual"
          value={formatoMW(Number(latestRow?.generado ?? 0))}
          subtitle="Snapshot más reciente"
          icon={<Sun size={20} />}
        />
        <KpiCard
          title="Generación anterior"
          value={formatoMW(Number(latestRow?.generadoAnt ?? 0))}
          subtitle="Período anterior"
          icon={<Activity size={20} />}
        />
        <KpiCard
          title="Delta MW"
          value={`${deltaMW >= 0 ? "+" : ""}${formatoNumero(deltaMW)} MW`}
          subtitle="Actual - anterior"
          icon={<TrendingUp size={20} />}
        />
        <KpiCard
          title="Variación %"
          value={`${Number(latestRow?.porcentaje ?? 0) >= 0 ? "+" : ""}${formatoNumero(
            Number(latestRow?.porcentaje ?? 0)
          )}%`}
          subtitle="Cambio relativo"
          icon={<BarChart3 size={20} />}
        />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle(), padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Histórico de generación</h2>
          <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
            Últimos 40 registros de Martí
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={historico}>
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
        </div>

        <div style={{ ...cardStyle(), padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Variación %</h2>
          <p style={{ margin: "6px 0 14px 0", color: COLORS.muted, fontSize: 13 }}>
            Evolución del porcentaje reportado
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={historico}>
              <CartesianGrid strokeDasharray="4 4" stroke="#D9D6CF" />
              <XAxis dataKey="fecha" tick={{ fill: "#4B5563", fontSize: 12 }} hide />
              <YAxis tick={{ fill: "#4B5563", fontSize: 12 }} />
              <Tooltip formatter={(value) => `${formatoNumero(Number(value ?? 0))}%`} />
              <Bar dataKey="porcentaje" fill={COLORS.gold} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}