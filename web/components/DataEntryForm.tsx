import React, { useEffect } from 'react';
import { TaskRow, TaskData } from '../types';
import { Plus, Trash2, Copy } from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

interface DataEntryFormProps {
  task: TaskData;
  rows: TaskRow[];
  setRows: React.Dispatch<React.SetStateAction<TaskRow[]>>;
}

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ task, rows, setRows }) => {

  useEffect(() => {
    if (rows.length === 0) {
      addRow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const createEmptyRow = (): TaskRow => ({
    machine_id: task.machine_id,
    circuit_name: '',
    area: '',
    device_pos: '',
    voltage: '',
    phase_wire: '',
    power: '',
    max_current: '',
    run_current: '',
    machine_switch: '',
    factory_switch: '',
    remark: ''
  });

  const addRow = () => {
    const newRow = createEmptyRow();
    // 新行继承第一行的区域
    if (rows.length > 0 && rows[0].area) {
      newRow.area = rows[0].area;
    }
    setRows([...rows, newRow]);
  };

  const duplicateRow = (index: number) => {
    const newRows = [...rows];
    newRows.splice(index + 1, 0, { ...rows[index] });
    setRows(newRows);
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const updateRow = (index: number, field: keyof TaskRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    
    // 区域字段：第一行修改时同步到所有行
    if (field === 'area' && index === 0) {
      newRows.forEach((row, i) => {
        if (i !== 0) {
          newRows[i] = { ...newRows[i], area: value };
        }
      });
    }
    
    setRows(newRows);
  };

  return (
    <div className="w-full flex flex-col gap-2 pointer-events-auto">
        {/* Table Header - Only visible if there are rows, compact styled */}
        <div className="flex gap-2 px-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center select-none ml-8">
            <div className="flex-[1.8] text-left">回路名称 *</div>
            <div className="flex-1">区域</div>
            <div className="flex-1">位置</div>
            <div className="flex-1">电压</div>
            <div className="flex-1">相线</div>
            <div className="flex-1">功率</div>
            <div className="flex-1">最大电流</div>
            <div className="flex-1">运行电流</div>
            <div className="flex-1 text-blue-600">机台开关(功率)</div>
            <div className="flex-1 text-purple-600">工厂开关(功率)</div>
            <div className="flex-1">备注</div>
            <div className="w-8"></div>
        </div>

      <div className="max-h-[35vh] overflow-y-auto pr-1 pb-32 space-y-2 custom-scrollbar">
        {rows.map((row, index) => (
          /* 
             Fix: Added focus-within:z-20 
             This ensures the currently active row sits visually ABOVE subsequent rows,
             preventing the autocomplete dropdown from being clipped by the next row's background.
          */
          <div key={index} className="flex items-center gap-2 bg-white/95 backdrop-blur shadow-sm border border-gray-200 p-2 rounded-lg hover:shadow-md transition-all group relative animate-in slide-in-from-bottom-2 fade-in duration-300 focus-within:z-20 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-lg">
            
            {/* Row Number */}
            <div className="w-6 text-center text-xs font-bold text-gray-400">
                {index + 1}
            </div>

            {/* Circuit Name (Wider) */}
            <div className="flex-[1.8] min-w-[120px]">
              <AutocompleteInput
                field="circuit_name"
                value={row.circuit_name}
                onChange={(val) => updateRow(index, 'circuit_name', val)}
                className="w-full h-9 px-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="回路名称"
                required
              />
            </div>

            {/* Standard Fields (Equal Width) */}
            {[
                { field: 'area', ph: '区域', firstOnly: true },
                { field: 'device_pos', ph: '位置' },
                { field: 'voltage', ph: '380V' },
                { field: 'phase_wire', ph: '3相4线' },
                { field: 'power', ph: '15KW' },
                { field: 'max_current', ph: '32A' },
                { field: 'run_current', ph: '20A' },
            ].map((col) => (
                <div key={col.field} className="flex-1 min-w-[60px]">
                    {col.firstOnly && index > 0 ? (
                      // 非第一行的区域字段：只读显示
                      <div className="w-full h-9 px-2 text-sm text-center border border-gray-200 rounded bg-gray-100 text-gray-500 flex items-center justify-center">
                        {rows[0]?.area || '-'}
                      </div>
                    ) : (
                      <AutocompleteInput
                          field={col.field}
                          value={(row as any)[col.field]}
                          onChange={(val) => updateRow(index, col.field as keyof TaskRow, val)}
                          className="w-full h-9 px-2 text-sm text-center border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                          placeholder={col.ph}
                      />
                    )}
                </div>
            ))}

            {/* Special Power Switches (Colored Borders) */}
            <div className="flex-1 min-w-[70px]">
                <AutocompleteInput
                    field="machine_switch"
                    value={row.machine_switch}
                    onChange={(val) => updateRow(index, 'machine_switch', val)}
                    className="w-full h-9 px-2 text-sm text-center border border-blue-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-blue-50/50 focus:bg-white text-blue-700 transition-colors"
                    placeholder="功率"
                />
            </div>
            <div className="flex-1 min-w-[70px]">
                 <AutocompleteInput
                    field="factory_switch"
                    value={row.factory_switch}
                    onChange={(val) => updateRow(index, 'factory_switch', val)}
                    className="w-full h-9 px-2 text-sm text-center border border-purple-200 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-purple-50/50 focus:bg-white text-purple-700 transition-colors"
                    placeholder="功率"
                />
            </div>

            {/* 备注 */}
            <div className="flex-1 min-w-[80px]">
                <input
                    type="text"
                    value={row.remark}
                    onChange={(e) => updateRow(index, 'remark', e.target.value)}
                    className="w-full h-9 px-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                    placeholder="备注"
                />
            </div>

            {/* Actions */}
            <div className="flex gap-1 w-16 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
               <button
                onClick={() => duplicateRow(index)}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                title="复制此行"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={addRow}
        className="self-center mt-1 px-4 py-1.5 bg-white/80 hover:bg-white text-blue-600 text-sm font-medium rounded-full shadow-sm border border-blue-200 backdrop-blur transition-all hover:scale-105 flex items-center gap-1"
      >
        <Plus size={16} /> 添加新行
      </button>
    </div>
  );
};
