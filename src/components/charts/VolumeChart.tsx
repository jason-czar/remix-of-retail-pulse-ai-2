import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

const generateVolumeData = () => {
  const data = [];
  const now = new Date();
  const baselineVolume = 5000;
  
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    // Create a spike around 6 hours ago
    const spikeMultiplier = i === 6 ? 3.5 : i === 5 || i === 7 ? 2 : 1;
    const volume = Math.round(baselineVolume * spikeMultiplier * (0.7 + Math.random() * 0.6));
    const isSpike = volume > baselineVolume * 2;
    
    data.push({
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      volume,
      baseline: baselineVolume,
      isSpike
    });
  }
  return data;
};

const data = generateVolumeData();

export function VolumeChart({ symbol }: { symbol: string }) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(168 84% 45%)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(168 84% 45%)" stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="spikeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
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
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 17%)",
              borderRadius: "8px",
              boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
            }}
            labelStyle={{ color: "hsl(210 40% 98%)" }}
            formatter={(value: number) => [`${value.toLocaleString()} messages`, "Volume"]}
          />
          <ReferenceLine 
            y={5000} 
            stroke="hsl(215 20% 55%)" 
            strokeDasharray="5 5"
            label={{ value: "Baseline", position: "right", fill: "hsl(215 20% 55%)", fontSize: 12 }}
          />
          <Bar 
            dataKey="volume" 
            fill="url(#volumeGradient)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
