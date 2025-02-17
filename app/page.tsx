"use client";

import { DataGrid } from "@/components/data-grid";

type ProductData = {
  id: number;
  name: string;
  DEHP: number;
  DBP: number;
  BBP: number;
  DINP: number;
  DIDP: number;
  DEP: number;
  DMP: number;
  DIBP: number;
};

const sampleData: ProductData[] = [
  {
    id: 1,
    name: "Distilled Water Sample A",
    DEHP: 2.2,
    DBP: 748,
    BBP: 440,
    DINP: 22,
    DIDP: 2.2,
    DEP: 220,
    DMP: 134.2,
    DIBP: 305,
  },
  {
    id: 2,
    name: "Organic Formula Sample B",
    DEHP: 1.825,
    DBP: 234.8,
    BBP: 110,
    DINP: 22,
    DIDP: 2.2,
    DEP: 220,
    DMP: 501.6,
    DIBP: 220,
  },
];

const columns = [
  { field: "name", header: "Product", width: 200 },
  { field: "DEHP", header: "DEHP mg/serving", width: 120 },
  { field: "DBP", header: "DBP ng/serving", width: 120 },
  { field: "BBP", header: "BBP ng/serving", width: 120 },
  { field: "DINP", header: "DINP mg/serving", width: 120 },
  { field: "DIDP", header: "DIDP mg/serving", width: 120 },
  { field: "DEP", header: "DEP ng/serving", width: 120 },
  { field: "DMP", header: "DMP ng/serving", width: 120 },
  { field: "DIBP", header: "DIBP mg/serving", width: 120 },
];

export default function Home() {
  return (
    <div className="w-full h-dvh">
      <DataGrid data={sampleData} columns={columns} />
    </div>
  );
}
