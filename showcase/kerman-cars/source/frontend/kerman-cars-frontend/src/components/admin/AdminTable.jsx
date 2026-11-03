export default function AdminTable({ columns, rows, renderActions }) {
    return (
        <div className="table-responsive">
            <table className="table align-middle">
                <thead>
                    <tr>
                        {columns.map(([key, label]) => (
                            <th scope="col" key={key}>
                                {label}
                            </th>
                        ))}
                        {renderActions && <th scope="col">عملیات</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            {columns.map(([key, , render]) => (
                                <td key={key}>
                                    {render ? render(row) : (row[key] ?? "—")}
                                </td>
                            ))}
                            {renderActions && (
                                <td>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {renderActions(row)}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
