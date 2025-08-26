import React, { useState } from "react";

const taxRules = {
  2023: {
    old: {
      slabs: [
        { upto: 250000, rate: 0 },
        { upto: 500000, rate: 0.05 },
        { upto: 1000000, rate: 0.2 },
        { upto: Infinity, rate: 0.3 },
      ],
    },
    new: {
      slabs: [
        { upto: 300000, rate: 0 },
        { upto: 600000, rate: 0.05 },
        { upto: 900000, rate: 0.1 },
        { upto: 1200000, rate: 0.15 },
        { upto: 1500000, rate: 0.2 },
        { upto: Infinity, rate: 0.3 },
      ],
    },
  },
  2024: {
    old: {
      slabs: [
        { upto: 250000, rate: 0 },
        { upto: 500000, rate: 0.05 },
        { upto: 1000000, rate: 0.2 },
        { upto: Infinity, rate: 0.3 },
      ],
    },
    new: {
      slabs: [
        { upto: 300000, rate: 0 },
        { upto: 700000, rate: 0.05 },
        { upto: 1000000, rate: 0.1 },
        { upto: 1250000, rate: 0.15 },
        { upto: 1500000, rate: 0.2 },
        { upto: Infinity, rate: 0.3 },
      ],
    },
  },
  2025: {
    old: {
      slabs: [
        { upto: 250000, rate: 0 },
        { upto: 500000, rate: 0.05 },
        { upto: 1000000, rate: 0.2 },
        { upto: Infinity, rate: 0.3 },
      ],
    },
    new: {
      slabs: [
        { upto: 400000, rate: 0 },
        { upto: 800000, rate: 0.05 },
        { upto: 1200000, rate: 0.1 },
        { upto: 1600000, rate: 0.15 },
        { upto: 2000000, rate: 0.2 },
        { upto: Infinity, rate: 0.3 },
      ],
    },
  },
};

const commonDeductions = [
  { key: "80C", label: "Section 80C (Investments, PF, LIC, etc.)", max: 150000 },
  { key: "80D", label: "Section 80D (Medical Insurance)", max: 25000 },
  { key: "HRA", label: "House Rent Allowance (HRA)", max: Infinity },
];

export default function TaxCalculator() {
  const [year, setYear] = useState(2023);
  const [income, setIncome] = useState(0);
  const [profession, setProfession] = useState("salaried");
  const [regime, setRegime] = useState("old");
  const [tax, setTax] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [deductions, setDeductions] = useState(
    Object.fromEntries(commonDeductions.map((d) => [d.key, 0]))
  );
  const [hraInputs, setHraInputs] = useState({ hraReceived: 0, rentPaid: 0, basicSalary: 0, metro: false });

  const handleDeductionChange = (key, value, max) => {
    setDeductions({
      ...deductions,
      [key]: Math.min(Number(value), max),
    });
  };

  const calculateHraExemption = () => {
    const { hraReceived, rentPaid, basicSalary, metro } = hraInputs;
    const actualHRA = hraReceived;
    const rentMinus10 = Math.max(0, rentPaid - 0.1 * basicSalary);
    const percSalary = (metro ? 0.5 : 0.4) * basicSalary;
    return Math.min(actualHRA, rentMinus10, percSalary);
  };

  const calculateTax = () => {
    let grossIncome = income;
    let netIncome = grossIncome;
    let breakdownDetails = [];

    // Special handling for freelancers under Section 44ADA
    if (profession === "freelancer") {
      if (grossIncome <= 7500000) { // 75 lakh presumptive taxation limit .
        let presumptiveIncome = grossIncome * 0.5; // 50% deemed profit
        breakdownDetails.push(`Section 44ADA applied: 50% of gross receipts ₹${grossIncome.toLocaleString()} = ₹${presumptiveIncome.toLocaleString()} taxable income`);
        netIncome = presumptiveIncome;
      } else {
        breakdownDetails.push(`Freelancer income exceeds presumptive taxation limit. Normal tax rules applied.`);
      }
    }

    if (regime === "old" && profession !== "freelancer") {
      let deductionsCopy = { ...deductions };

      // Apply HRA exemption if details provided
      if (hraInputs.hraReceived > 0 && hraInputs.rentPaid > 0 && hraInputs.basicSalary > 0) {
        deductionsCopy["HRA"] = calculateHraExemption();
        breakdownDetails.push(`HRA exemption calculated as: ₹${deductionsCopy["HRA"].toLocaleString()} (least of actual HRA, rent paid - 10% salary, and % of salary)`);
      }

      // Apply Standard Deduction automatically for salaried
      if (profession === "salaried") {
        let stdDeduction = year === 2025 ? 75000 : 50000;
        deductionsCopy["StandardDeduction"] = stdDeduction;
        breakdownDetails.push(`Standard Deduction applied: ₹${stdDeduction.toLocaleString()}`);
      }

      let totalDeductions = Object.values(deductionsCopy).reduce(
        (sum, val) => sum + val,
        0
      );
      netIncome = Math.max(0, grossIncome - totalDeductions);
      breakdownDetails.push(`Total Deductions Applied: ₹${totalDeductions.toLocaleString()}`);
      breakdownDetails.push(`Net Taxable Income after Deductions: ₹${netIncome.toLocaleString()}`);
    } else if (regime === "new" && profession !== "freelancer") {
      breakdownDetails.push(`No deductions allowed under New Regime.`);
      netIncome = grossIncome;
    }

    let taxAmount = 0;
    let slabs = taxRules[year][regime].slabs;
    let prevLimit = 0;

    for (let slab of slabs) {
      if (netIncome > slab.upto) {
        let taxable = slab.upto - prevLimit;
        let taxForSlab = taxable * slab.rate;
        taxAmount += taxForSlab;
        breakdownDetails.push(`₹${taxable.toLocaleString()} taxed at ${slab.rate * 100}% = ₹${taxForSlab.toLocaleString()}`);
        prevLimit = slab.upto;
      } else {
        let taxable = netIncome - prevLimit;
        let taxForSlab = taxable * slab.rate;
        taxAmount += taxForSlab;
        breakdownDetails.push(`₹${taxable.toLocaleString()} taxed at ${slab.rate * 100}% = ₹${taxForSlab.toLocaleString()}`);
        break;
      }
    }

    let cess = taxAmount * 0.04;
    taxAmount += cess;
    breakdownDetails.push(`Health & Education Cess (4%): ₹${cess.toLocaleString()}`);

    setTax(taxAmount);
    setBreakdown(breakdownDetails);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">India Tax Calculator</h1>

        <label className="block mb-2">Select Year:</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full p-2 mb-4 border rounded"
        >
          <option value={2023}>2023</option>
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
        </select>

        <label className="block mb-2">Select Profession:</label>
        <select
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        >
          <option value="salaried">Salaried</option>
          <option value="business">Business</option>
          <option value="freelancer">Freelancer</option>
        </select>

        <label className="block mb-2">Select Regime:</label>
        <select
          value={regime}
          onChange={(e) => setRegime(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        >
          <option value="old">Old Regime</option>
          <option value="new">New Regime</option>
        </select>

        <label className="block mb-2">Enter Annual Income (₹):</label>
        <input
          type="number"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full p-2 mb-4 border rounded"
        />

        {regime === "old" && profession !== "freelancer" && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Enter Deductions:</h3>
            {commonDeductions.map((d) => (
              <div key={d.key} className="mb-2">
                {d.key === "HRA" ? (
                  <>
                    <label className="block text-sm mb-1">{d.label}</label>
                    <div className="space-y-2">
                      <input
                        type="number"
                        placeholder="HRA Received"
                        onChange={(e) => setHraInputs({ ...hraInputs, hraReceived: Number(e.target.value) })}
                        className="w-full p-2 border rounded"
                      />
                      <input
                        type="number"
                        placeholder="Rent Paid"
                        onChange={(e) => setHraInputs({ ...hraInputs, rentPaid: Number(e.target.value) })}
                        className="w-full p-2 border rounded"
                      />
                      <input
                        type="number"
                        placeholder="Basic Salary"
                        onChange={(e) => setHraInputs({ ...hraInputs, basicSalary: Number(e.target.value) })}
                        className="w-full p-2 border rounded"
                      />
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={hraInputs.metro}
                          onChange={(e) => setHraInputs({ ...hraInputs, metro: e.target.checked })}
                        />
                        <span>Metro City (50% of salary)</span>
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-sm mb-1">{d.label} (Max: ₹{d.max.toLocaleString()})</label>
                    <input
                      type="number"
                      value={deductions[d.key]}
                      onChange={(e) => handleDeductionChange(d.key, e.target.value, d.max)}
                      className="w-full p-2 border rounded"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={calculateTax}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Calculate Tax
        </button>

        {tax !== null && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
            <h2 className="text-lg font-semibold">Estimated Tax: ₹{tax.toLocaleString()}</h2>
            <ul className="mt-2 list-disc pl-6 text-sm">
              {breakdown.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
