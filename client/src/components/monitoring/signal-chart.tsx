import { useEffect, useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import type { NodeData } from '@/types';

interface SignalChartProps {
  nodes: NodeData[];
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  values: { [nodeId: string]: number };
}

interface TimeScale {
  label: string;
  seconds: number;
  interval: number; // Data collection interval in milliseconds
  maxPoints: number;
}

const TIME_SCALES: TimeScale[] = [
  { label: "1 Second", seconds: 1, interval: 100, maxPoints: 10 },
  { label: "10 Seconds", seconds: 10, interval: 500, maxPoints: 20 },
  { label: "30 Seconds", seconds: 30, interval: 1000, maxPoints: 30 },
  { label: "1 Minute", seconds: 60, interval: 2000, maxPoints: 30 },
  { label: "5 Minutes", seconds: 300, interval: 10000, maxPoints: 30 },
  { label: "15 Minutes", seconds: 900, interval: 30000, maxPoints: 30 },
  { label: "30 Minutes", seconds: 1800, interval: 60000, maxPoints: 30 },
  { label: "1 Hour", seconds: 3600, interval: 120000, maxPoints: 30 },
  { label: "2 Hours", seconds: 7200, interval: 240000, maxPoints: 30 },
  { label: "5 Hours", seconds: 18000, interval: 600000, maxPoints: 30 },
];

export default function SignalChart({ nodes }: SignalChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedTimeScale, setSelectedTimeScale] = useState<TimeScale>(TIME_SCALES[2]); // Default to 30 seconds
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Colors for different nodes
  const nodeColors = [
    '#388E3C', // secondary (green)
    '#1976D2', // primary (blue)
    '#FF9800', // accent (orange)
    '#9C27B0', // purple
    '#F44336', // red
    '#00BCD4', // cyan
  ];

  // Data collection effect - controlled by time scale interval
  useEffect(() => {
    const now = Date.now();
    
    // Check if enough time has passed based on selected time scale
    if (now - lastUpdate < selectedTimeScale.interval) {
      return;
    }

    const currentTime = new Date(now);
    const timeString = selectedTimeScale.seconds <= 60 
      ? currentTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      : currentTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });

    const newDataPoint: ChartDataPoint = {
      time: timeString,
      timestamp: now,
      values: {}
    };

    // Add current RSSI values for online nodes
    nodes.forEach(node => {
      if (node.isOnline && node.rssi) {
        newDataPoint.values[node.nodeId] = node.rssi;
      }
    });

    setChartData(prevData => {
      const cutoffTime = now - (selectedTimeScale.seconds * 1000);
      const filteredData = prevData.filter(point => point.timestamp > cutoffTime);
      const updatedData = [...filteredData, newDataPoint];
      return updatedData.slice(-selectedTimeScale.maxPoints);
    });

    setLastUpdate(now);
  }, [nodes, selectedTimeScale, lastUpdate]);

  // Clear data when time scale changes
  useEffect(() => {
    setChartData([]);
    setLastUpdate(Date.now());
  }, [selectedTimeScale]);

  const handleClearData = () => {
    setChartData([]);
    setLastUpdate(Date.now());
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#1E1E1E'; // surface-variant
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // Get all unique node IDs that appear in the data
    const allNodeIds = Array.from(new Set(
      chartData.flatMap(point => Object.keys(point.values))
    ));

    if (allNodeIds.length === 0) {
      // Draw "No Data" message
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No signal data available', rect.width / 2, rect.height / 2);
      return;
    }

    // Find RSSI range
    const allRssiValues = chartData.flatMap(point => Object.values(point.values));
    const minRssi = Math.min(-100, Math.min(...allRssiValues) - 5);
    const maxRssi = Math.max(-40, Math.max(...allRssiValues) + 5);

    // Draw grid lines and labels
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#9CA3AF';

    // Horizontal grid lines (RSSI values)
    const rssiSteps = 5;
    for (let i = 0; i <= rssiSteps; i++) {
      const rssi = minRssi + (maxRssi - minRssi) * (i / rssiSteps);
      const y = padding + chartHeight * (1 - (rssi - minRssi) / (maxRssi - minRssi));

      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(rssi)}`, padding - 5, y + 3);
    }

    // Vertical grid lines (time)
    const timeSteps = Math.min(6, chartData.length - 1);
    for (let i = 0; i <= timeSteps; i++) {
      const dataIndex = Math.floor((chartData.length - 1) * (i / timeSteps));
      const x = padding + chartWidth * (i / timeSteps);

      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(chartData[dataIndex]?.time || '', x, rect.height - 5);
    }

    // Draw axis labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time', rect.width / 2, rect.height - 20);

    ctx.save();
    ctx.translate(15, rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('RSSI (dBm)', 0, 0);
    ctx.restore();

    // Draw lines for each node
    allNodeIds.forEach((nodeId, index) => {
      const color = nodeColors[index % nodeColors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      let firstPoint = true;

      chartData.forEach((point, pointIndex) => {
        if (point.values[nodeId] !== undefined) {
          const x = padding + (pointIndex / (chartData.length - 1)) * chartWidth;
          const y = padding + chartHeight * (1 - (point.values[nodeId] - minRssi) / (maxRssi - minRssi));

          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });

      ctx.stroke();

      // Draw points
      ctx.fillStyle = color;
      chartData.forEach((point, pointIndex) => {
        if (point.values[nodeId] !== undefined) {
          const x = padding + (pointIndex / (chartData.length - 1)) * chartWidth;
          const y = padding + chartHeight * (1 - (point.values[nodeId] - minRssi) / (maxRssi - minRssi));

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });

    // Draw legend
    const legendY = padding + 10;
    allNodeIds.forEach((nodeId, index) => {
      const color = nodeColors[index % nodeColors.length];
      const legendX = padding + index * 120;

      // Legend color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 12, 12);

      // Legend text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      const nodeName = nodes.find(n => n.nodeId === nodeId)?.name || nodeId.slice(-4);
      ctx.fillText(nodeName, legendX + 16, legendY + 9);
    });

  }, [chartData, nodes]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Time Scale Controls */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Time Scale:</span>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={selectedTimeScale.label} 
            onValueChange={(value) => {
              const scale = TIME_SCALES.find(ts => ts.label === value);
              if (scale) setSelectedTimeScale(scale);
            }}
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-surface border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface border-gray-600">
              {TIME_SCALES.map((scale) => (
                <SelectItem key={scale.label} value={scale.label} className="text-xs">
                  {scale.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearData}
            className="h-8 px-2 text-xs border-gray-600 hover:bg-gray-700"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ background: 'var(--surface-variant)' }}
        />
      </div>
    </div>
  );
}
