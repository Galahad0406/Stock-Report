"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Building2,
  Calendar,
  Search,
  ArrowUpDown,
  ExternalLink,
  RefreshCw,
  Info
} from "lucide-react";

interface Holding {
  rank: number;
  code: string;
  name: string;
  shares: number;
  value: number;
  weight: number;
  change: number;
}

interface InstitutionalData {
  updatedAt: string;
  totalValue: number;
  holdings: Holding[];
}

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("weight");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/data/latest.json");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSort = (key: keyof Holding) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const filteredHoldings = data?.holdings
    ? data.holdings
        .filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.includes(searchTerm)
        )
        .sort((a, b) => {t
          const aVal = a[sortKey];
          const bVal = b[sortKey];
          if (typeof aVal === "number" && typeof bVal === "number") {
            return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
          }
          return 0;
        })
    : [];

  if (loading) {
    return (
