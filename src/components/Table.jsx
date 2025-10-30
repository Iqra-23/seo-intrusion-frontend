export default function Table({ columns, data }) {
  return (
    <table className="w-full bg-white rounded shadow">
      <thead className="bg-gray-200">
        <tr>
          {columns.map((col) => (
            <th key={col} className="p-2 text-left">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b hover:bg-gray-50">
            {Object.values(row).map((val, j) => (
              <td key={j} className="p-2">{val?.toString()}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}