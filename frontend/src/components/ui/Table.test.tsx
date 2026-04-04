import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Table, type Column } from "./Table";

interface TestRow {
  id: string;
  name: string;
  status: string;
}

const columns: Column<TestRow>[] = [
  { key: "name", header: "名前" },
  { key: "status", header: "ステータス" },
];

const data: TestRow[] = [
  { id: "1", name: "案件A", status: "進行中" },
  { id: "2", name: "案件B", status: "完了" },
];

describe("Table", () => {
  it("renders column headers", () => {
    render(<Table columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("ステータス")).toBeInTheDocument();
  });

  it("renders data rows", () => {
    render(<Table columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText("案件A")).toBeInTheDocument();
    expect(screen.getByText("完了")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    render(<Table columns={columns} data={[]} rowKey={(r: TestRow) => r.id} emptyMessage="データなし" />);
    expect(screen.getByText("データなし")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<Table columns={columns} data={[]} rowKey={(r: TestRow) => r.id} loading />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", () => {
    const onClick = vi.fn();
    render(<Table columns={columns} data={data} rowKey={(r) => r.id} onRowClick={onClick} />);
    fireEvent.click(screen.getByText("案件A"));
    expect(onClick).toHaveBeenCalledWith(data[0]);
  });

  it("supports custom render function", () => {
    const cols: Column<TestRow>[] = [
      { key: "name", header: "名前", render: (r) => <strong>{r.name}</strong> },
    ];
    render(<Table columns={cols} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText("案件A").tagName).toBe("STRONG");
  });
});
