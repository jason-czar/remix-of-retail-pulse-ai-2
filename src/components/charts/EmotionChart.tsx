import { 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

// Emotion definitions based on spec
const emotions = [
  { name: "Excitement", color: "hsl(168 84% 45%)" },
  { name: "Fear", color: "hsl(0 72% 51%)" },
  { name: "Hopefulness", color: "hsl(142 71% 45%)" },
  { name: "Frustration", color: "hsl(38 92% 50%)" },
  { name: "Conviction", color: "hsl(199 89% 48%)" },
  { name: "Disappointment", color: "hsl(280 65% 60%)" },
  { name: "Sarcasm", color: "hsl(330 81% 60%)" },
  { name: "Humor", color: "hsl(45 93% 47%)" },
  { name: "Grit", color: "hsl(262 83% 58%)" },
  { name: "Surprise", color: "hsl(173 80% 40%)" }
];

const generateEmotionData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const entry: Record<string, any> = {
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    };
    emotions.forEach((emotion, idx) => {
      const phase = (i + idx * 1.5) / 5;
      const baseValue = 10 + Math.sin(phase) * 8;
      entry[emotion.name] = Math.round(Math.max(0, Math.min(30, baseValue + (Math.random() - 0.5) * 6)));
    });
    data.push(entry);
  }
  return data;
};

const data = generateEmotionData();

export function EmotionChart({ symbol }: { symbol: string }) {
  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
            domain={[0, 30]}
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
          {emotions.map((emotion) => (
            <Line
              key={emotion.name}
              type="monotone"
              dataKey={emotion.name}
              stroke={emotion.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: emotion.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
