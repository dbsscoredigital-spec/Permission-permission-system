import React, { useState } from 'react';

interface DonBoscoLogoProps {
  className?: string;
  size?: number;
  logoUrl?: string;
}

export const DonBoscoLogo: React.FC<DonBoscoLogoProps> = ({ className = "w-12 h-12", size = 120, logoUrl }) => {
  const [imageError, setImageError] = useState(false);

  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt="ตราสัญลักษณ์วิทยาลัย"
        className={`${className} object-contain rounded-full`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      style={{ width: size, height: size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ตราสัญลักษณ์วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์"
    >
      <defs>
        {/* Top Arc for College Name */}
        <path
          id="topArc"
          d="M 52,200 A 148,148 0 1,1 348,200"
          fill="none"
        />
        {/* Bottom Arc for Province & District */}
        <path
          id="bottomArc"
          d="M 54,200 A 146,146 0 0,0 346,200"
          fill="none"
        />
        {/* Motto Ribbon Arc */}
        <path
          id="mottoArc"
          d="M 95,270 A 110,110 0 0,0 305,270"
          fill="none"
        />
      </defs>

      {/* Background White Fill */}
      <circle cx="200" cy="200" r="192" fill="#ffffff" />

      {/* Outer Thick Border */}
      <circle cx="200" cy="200" r="190" stroke="#0e2348" strokeWidth="9" />

      {/* Inner Thin Border */}
      <circle cx="200" cy="200" r="132" stroke="#0e2348" strokeWidth="4" />

      {/* Top Text: วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์ */}
      <text fill="#0e2348" fontSize="21.5" fontWeight="900" fontFamily="'Sarabun', 'TH Sarabun New', Tahoma, sans-serif">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          วิทยาลัยเทคโนโลยีดอนบอสโกสุราษฎร์
        </textPath>
      </text>

      {/* Left Icon: Open Book */}
      <g transform="translate(18, 178) scale(0.9)" stroke="#0e2348" strokeWidth="3" fill="none">
        <path d="M 5,20 C 15,10 30,12 40,16 L 40,38 C 30,34 15,32 5,42 Z" fill="#0e2348" fillOpacity="0.1" />
        <path d="M 75,20 C 65,10 50,12 40,16 L 40,38 C 50,34 65,32 75,42 Z" fill="#0e2348" fillOpacity="0.1" />
        <line x1="40" y1="16" x2="40" y2="40" stroke="#0e2348" strokeWidth="3.5" />
        <path d="M 5,20 Q 22,12 40,16 Q 58,12 75,20" />
        <path d="M 5,42 Q 22,34 40,38 Q 58,34 75,42" />
        <line x1="5" y1="20" x2="5" y2="42" />
        <line x1="75" y1="20" x2="75" y2="42" />
      </g>

      {/* Right Icon: Crossed Hammer & Wrench */}
      <g transform="translate(340, 178) scale(0.85)" stroke="#0e2348" strokeWidth="3.5" fill="#0e2348">
        {/* Wrench */}
        <path d="M 10,10 L 35,35 M 32,32 L 40,40" strokeWidth="5" strokeLinecap="round" />
        <circle cx="8" cy="8" r="7" fill="none" strokeWidth="4" />
        <line x1="2" y1="8" x2="8" y2="8" strokeWidth="3" />
        {/* Hammer */}
        <line x1="10" y1="40" x2="38" y2="12" strokeWidth="5" strokeLinecap="round" />
        <rect x="30" y="4" width="16" height="10" rx="2" transform="rotate(-45 38 9)" />
      </g>

      {/* Center Silhouette Portrait: Saint John Bosco (คุณพ่อบอสโก) */}
      <g fill="#0e2348" stroke="#0e2348" strokeWidth="0.5">
        {/* Hair and Head Shape */}
        <path d="M 148,155 C 145,130 162,105 195,100 C 235,95 258,118 255,145 C 255,155 264,162 260,178 C 256,192 248,198 248,208 C 248,225 240,248 225,258 C 215,265 185,265 175,258 C 160,248 152,225 152,208 C 152,198 144,192 140,178 C 138,165 146,158 148,155 Z" fillOpacity="0.08" stroke="none" />
        
        {/* Iconic Hair Curl Outlines */}
        <path d="M 152,150 C 144,138 150,118 165,108 C 178,100 195,98 212,100 C 232,102 248,112 254,128 C 258,138 255,150 252,158 C 262,165 260,180 255,190 C 250,192 248,185 248,178 C 245,160 248,140 238,126 C 228,114 212,112 196,114 C 180,116 168,125 162,138 C 158,148 158,162 152,175 C 146,182 144,170 146,162 Z" />

        {/* Eyes & Brows */}
        <path d="M 172,175 C 178,172 188,172 194,176" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <ellipse cx="184" cy="184" rx="4" ry="2.5" />
        <path d="M 210,176 C 216,172 226,172 232,175" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <ellipse cx="220" cy="184" rx="4" ry="2.5" />

        {/* Nose & Character Lines */}
        <path d="M 203,178 L 202,205 C 200,209 194,212 198,216 C 202,218 208,218 212,215" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Kindly Smile */}
        <path d="M 182,230 C 192,238 212,238 222,230" strokeWidth="3.8" fill="none" strokeLinecap="round" />
        <path d="M 192,242 C 198,245 206,245 212,242" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Chin & Jaw Silhouette */}
        <path d="M 165,198 C 162,222 172,254 202,260 C 232,254 242,222 239,198" strokeWidth="3" fill="none" />

        {/* Clerical Cassock Collar */}
        <path d="M 174,265 L 170,290 C 185,296 219,296 234,290 L 230,265 Z" fill="#0e2348" />
        <rect x="196" y="265" width="12" height="15" fill="#ffffff" />
      </g>

      {/* Motto Banner Arc: วินัย ใฝ่คุณธรรม นำฝีมือ */}
      <path d="M 88,276 C 140,326 260,326 312,276" stroke="#0e2348" strokeWidth="1.5" strokeDasharray="3,3" />
      <text fill="#0e2348" fontSize="13.5" fontWeight="bold" fontFamily="'Sarabun', 'TH Sarabun New', Tahoma, sans-serif">
        <textPath href="#mottoArc" startOffset="50%" textAnchor="middle">
          วินัย  ใฝ่คุณธรรม  นำฝีมือ
        </textPath>
      </text>

      {/* Bottom Text: อำเภอเมือง จังหวัดสุราษฎร์ธานี */}
      <text fill="#0e2348" fontSize="19" fontWeight="900" fontFamily="'Sarabun', 'TH Sarabun New', Tahoma, sans-serif">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
          อำเภอเมือง   จังหวัดสุราษฎร์ธานี
        </textPath>
      </text>
    </svg>
  );
};
