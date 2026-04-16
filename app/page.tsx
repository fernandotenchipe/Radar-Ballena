import DashboardLayout from "@/components/Layout";
import { AlertItem } from "@/components/AlertCard";
import { FeedChannel, WhalePerformance } from "@/components/Layout";

const baseAlerts: AlertItem[] = [
  {
    id: "1",
    category: "Geopolitical Macro",
    trader: "Geopolitical Macro Omega",
    question: "¿El petróleo crudo (CL) alcanzará (ALTO) $120 para finales de junio?",
    action: "BUY",
    outcome: "YES",
    size: "$1.6k",
    price: "47¢",
    shares: "3,333",
    timestamp: "hace 2 min",
  },
  {
    id: "2",
    category: "NBA Volume",
    trader: "NBA Volume Alpha",
    question: "¿Ganarán los Celtics el título NBA 2026?",
    action: "BUY",
    outcome: "YES",
    size: "$7.2k",
    price: "61¢",
    shares: "8,400",
    timestamp: "hace 11 min",
  },
  {
    id: "3",
    category: "Geopolitical Macro",
    trader: "Geopolitical Macro Prime",
    question: "¿Ganará la oposición las elecciones de Turquía 2026?",
    action: "SELL",
    outcome: "YES",
    size: "$4.1k",
    price: "71¢",
    shares: "6,000",
    timestamp: "hace 34 min",
  },
  {
    id: "4",
    category: "Sports Grinder",
    trader: "Sports Grinder Legacy",
    question: "¿Ganará el Real Madrid la Champions League 2026?",
    action: "BUY",
    outcome: "NO",
    size: "$3.2k",
    price: "40¢",
    shares: "7,500",
    timestamp: "ayer 21:04",
    isHistory: true,
  },
];

const channels: FeedChannel[] = [
  {
    id: "depredador-deportivo",
    name: "Depredador Deportivo",
    alerts: baseAlerts,
  },
  {
    id: "titan-futbol-esports",
    name: "Titán del Fútbol Esports",
    alerts: baseAlerts,
  },
  {
    id: "titan-volumen-nba",
    name: "Titán del Volumen NBA",
    alerts: baseAlerts,
  },
  {
    id: "dualista-nba-esports",
    name: "Dualista NBA Esports",
    alerts: baseAlerts,
  },
  {
    id: "trader-total-1",
    name: "Trader Total",
    alerts: baseAlerts,
  },
  {
    id: "trader-total-2",
    name: "Trader Total",
    alerts: baseAlerts,
  },
  {
    id: "arbitrajista-global",
    name: "Arbitrajista Deportivo Global",
    alerts: baseAlerts,
  },
  {
    id: "especialista-deportivo",
    name: "Especialista Deportivo",
    alerts: baseAlerts,
  },
  {
    id: "estratega-geopolitico",
    name: "Estratega Geopolítico",
    alerts: baseAlerts,
  },
];

const whalePerformance: WhalePerformance[] = [
  { id: "w1", whaleName: "Depredador Deportivo", wins: 37, losses: 18 },
  { id: "w2", whaleName: "Titán del Fútbol Esports", wins: 29, losses: 21 },
  { id: "w3", whaleName: "Titán del Volumen NBA", wins: 42, losses: 16 },
  { id: "w4", whaleName: "Dualista NBA Esports", wins: 31, losses: 20 },
  { id: "w5", whaleName: "Trader Total", wins: 34, losses: 26 },
  { id: "w6", whaleName: "Trader Total", wins: 27, losses: 19 },
  { id: "w7", whaleName: "Arbitrajista Deportivo Global", wins: 45, losses: 15 },
  { id: "w8", whaleName: "Especialista Deportivo", wins: 39, losses: 17 },
  { id: "w9", whaleName: "Estratega Geopolítico", wins: 33, losses: 23 },
];

export default function Home() {
  return <DashboardLayout channels={channels} whalePerformance={whalePerformance} />;
}
