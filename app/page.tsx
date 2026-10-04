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

  useEffect(() => {
    fetch("/data/latest.json")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
