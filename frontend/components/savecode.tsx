/* แสดงอารมณ์และคะแนนอารมณ์หลังจากรีเซ็ตหน้าเว็บ
<div className='px-6 w-0 flex-1'>
    <button onClick={() => setConfig(prev => ({ ...prev, systemPrompt: prefix }))} className="relative bottom-0 flex justify-center items-center gap-2 border border-[#000] rounded-xl text-[#FFF] font-black bg-[#000] uppercase px-8 py-4 z-10 overflow-hidden ease-in-out duration-700 group hover:text-[#000] hover:bg-[#FFF] active:scale-95 active:duration-0 focus:bg-[#FFF] focus:text-[#000] isolation-auto before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-[#FFF] before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700">
        <span>รีเซ็ต Emotion</span>
    </button>
    <h1 className='text-4xl font-bold tracking-tight mb-3 mt-3 '>อารมณ์ : <span className="text-pink-600">{emotion}</span></h1>
    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
        <h2 className="font-semibold mb-2 text-lg">Emotion Scores</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(emotionScores).length === 0 ? (
                <span className="col-span-3 text-gray-400">ยังไม่มีข้อมูล</span>
            ) : (
                Object.entries(emotionScores).map(([emotion, score]) => (
                    <div key={emotion} className="flex justify-between bg-white rounded px-3 py-1 border border-gray-100 shadow-sm">
                        <span className="font-medium">{emotion}</span>
                        <span className="text-blue-600 font-bold">{score}</span>
                    </div>
                ))
            )}
        </div>
    </div>
</div>
*/