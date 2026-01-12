import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

// Mock narrative data
const narratives = [
  { name: "AI Integration", color: "hsl(168 84% 45%)" },
  { name: "Earnings Expectations", color: "hsl(142 71% 45%)" },
  { name: "Vision Pro Launch", color: "hsl(199 89% 48%)" },
  { name: "China Market", color: "hsl(280 65% 60%)" },
  { name: "Services Revenue", color: "hsl(38 92% 50%)" },
  { name: "Buyback Program", color: "hsl(0 72% 51%)" },
  { name: "Dividend Outlook", color: "hsl(262 83% 58%)" },
  { name: "Competition Analysis", color: "hsl(330 81% 60%)" },
  { name: "Supply Chain", color: "hsl(45 93% 47%)" },
  { name: "Valuation Debate", color: "hsl(173 80% 40%)" }
];

const generateNarrativeData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const entry: Record<string, any> = {
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    };
    narratives.forEach((narrative, idx) => {
      const phase = (i + idx * 2) / 6;
      const baseValue = 15 + Math.sin(phase) * 10;
      entry[narrative.name] = Math.round(Math.max(0, baseValue + (Math.random() - 0.5) * 8));
    });
    data.push(entry);
  }
  return data;
};

const data = generateNarrativeData();

export function NarrativeChart({ symbol }: { symbol: string }) {
  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {narratives.map((narrative, idx) => (
              <linearGradient key={narrative.name} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={narrative.color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={narrative.color} stopOpacity={0.05}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 17%)",
              borderRadius: "8px",
              boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
            }}
            labelStyle={{ color: "hsl(210 40% 98%)" }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => <span style={{ color: "hsl(210 40% 98%)", fontSize: "12px" }}>{value}</span>}
          />
          {narratives.map((narrative, idx) => (
            <Area
              key={narrative.name}
              type="monotone"
              dataKey={narrative.name}
              stroke={narrative.color}
              strokeWidth={2}
              fill={`url(#gradient-${idx})`}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
