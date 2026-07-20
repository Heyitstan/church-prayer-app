'use client'

export default function TagFilter({ selectedTag, onSelectTag }) {
  const TAGS = ['All', 'Healing', 'Family', 'Guidance', 'Praise', 'Loss'];

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelectTag(tag)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            selectedTag === tag 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}