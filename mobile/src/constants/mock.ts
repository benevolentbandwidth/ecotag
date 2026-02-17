import { ScanHistoryItem, ScenarioResult } from "../types/api";

const mockResult: ScenarioResult = {
  total_kgco2e: 8.2,
  breakdown: {
    materials: 3.1,
    manufacturing: 2.4,
    washing: 2.7,
    transport: 0,
  },
  assumptions: {
    weight: "200g estimated",
    washes: "2 per month over 2 years",
  },
};

export const MOCK_HISTORY: ScanHistoryItem[] = [
  {
    id: "1",
    garment_name: "Cotton T-Shirt",
    garment_type: "tshirt",
    score: 72,
    description: "100% Organic Cotton, Made in Portugal",
    timestamp: "2 hours ago",
    result: mockResult,
  },
  {
    id: "2",
    garment_name: "Denim Jacket",
    garment_type: "jacket",
    score: 45,
    description: "98% Cotton 2% Elastane, Made in China",
    timestamp: "Yesterday",
    result: {
      total_kgco2e: 14.6,
      breakdown: {
        materials: 5.8,
        manufacturing: 4.2,
        washing: 4.6,
        transport: 0,
      },
      assumptions: {
        weight: "800g estimated",
        washes: "1 per month over 3 years",
      },
    },
  },
  {
    id: "3",
    garment_name: "Polyester Hoodie",
    garment_type: "hoodie",
    score: 38,
    description: "100% Recycled Polyester, Made in Vietnam",
    timestamp: "3 days ago",
    result: {
      total_kgco2e: 11.3,
      breakdown: {
        materials: 4.5,
        manufacturing: 3.1,
        washing: 3.7,
        transport: 0,
      },
      assumptions: {
        weight: "450g estimated",
        washes: "2 per month over 2 years",
      },
    },
  },
];
