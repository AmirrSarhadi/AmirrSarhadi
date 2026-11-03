"use client";

import {ArrowUpLeft,MapPin} from "lucide-react";

const directions="https://maps.app.goo.gl/iCHpVtgRXoPcKC9s9";
const embed="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d6889.694505418889!2d57.0656253!3d30.2984098!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f0218667cb3a72f%3A0xb27d5d5d31676236!2z2K_YqNuM2LHYs9iq2KfZhiDZgdin2LfZhduM2Yc!5e0!3m2!1sen!2s!4v1792399115948!5m2!1sen!2s";

export function SchoolMap(){
 return <div className="school-map"><iframe title="نقشه نشانی دبیرستان دخترانه مدرسه نمونه" src={embed} width="480" height="220" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/><a href={directions} target="_blank" rel="noopener noreferrer"><MapPin size={15}/><span>مسیریابی تا مدرسه</span><ArrowUpLeft size={16}/></a></div>;
}
