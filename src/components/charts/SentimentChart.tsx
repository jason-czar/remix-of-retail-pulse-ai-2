import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from "recharts";

// Generate mock sentiment data
const generateSentimentData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const baseValue = 55 + Math.sin(i / 4) * 15;
    const noise = (Math.random() - 0.5) * 10;
    data.push({
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      sentiment: Math.round(Math.max(0, Math.min(100, baseValue + noise))),
      bullish: Math.round(Math.max(0, Math.min(100, baseValue + noise + 5))),
      bearish: Math.round(Math.max(0, Math.min(100, 100 - baseValue - noise)))
    });
  }
  return data;
};

const data = generateSentimentData();

export function SentimentChart({ symbol }: { symbol: string }) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(168 84% 45%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(168 84% 45%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
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
            itemStyle={{ color: "hsl(168 84% 45%)" }}
          />
          <ReferenceLine y={50} stroke="hsl(215 20% 55%)" strokeDasharray="5 5" />
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="hsl(168 84% 45%)" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: "hsl(168 84% 45%)" }}
          />
          <Line 
            type="monotone" 
            dataKey="bullish" 
            stroke="hsl(142 71% 45%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="bearish" 
            stroke="hsl(0 72% 51%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
