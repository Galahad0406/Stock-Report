"use client";

import React, { useState, useEffect } from "react";

type NewsItem = {
  headline: string;
  summary?: string;
  source?: string;
  url: string;
  publishedAt: string;
};

type Holding = {
  cusip: string;
  issuerName: string;
  aggregateReportedValue: number;
  aggregateShares: number;
  filerCount: number;
  ticker?: string;
  exchange?: string;
  securityName?: string;
  news: NewsItem[];
};

type ReportData = {
  generatedAt: string | null;
  sourceQuarter: string | null;
  sourceDatasetUrl: string | null;
  methodology: string;
  totalRowsProcessed: number;
  totalUniqueCusips: number;
  holdings: Holding[];
};

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedHolding, setSelectedHolding] = useState(null);

  useEffect(() => {
    fetch("/data/latest.json")
      .then((res) => res.json())
      .then((json: ReportData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setLoading(false);
      });
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const formatShares = (val: number) => {
    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B shares`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M shares`;
    return `${val.toLocaleString()} shares`;
  };

  const filteredHoldings = data?.holdings?.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.issuerName.toLowerCase().includes(q) ||
      item.cusip.toLowerCase().includes(q) ||
      (item.ticker && item.ticker.toLowerCase().includes(q))
    );
  }) || [];

  if (loading) {
    return (
