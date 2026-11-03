import {Atom, BookOpen, GraduationCap, Pencil, Ruler} from "lucide-react";

export function SchoolOrbit({compact = false}: {compact?: boolean}) {
  return <div className={`school-orbit${compact ? " orbit-compact" : ""}`} aria-hidden="true" data-public-loop>
    <div className="study-orbit-ring ring-inner"/><div className="study-orbit-ring ring-outer"/>
    <div className="orbit-notebook"><div className="notebook-binding"/><div className="notebook-lines"><i/><i/><i/></div><div className="notebook-eyes"><i/><i/></div><span className="notebook-smile"/><Pencil className="notebook-pencil" size={36}/></div>
    <div className="study-orbit-track orbit-track-one"><span className="orbit-satellite satellite-book"><BookOpen size={23}/></span></div>
    <div className="study-orbit-track orbit-track-two"><span className="orbit-satellite satellite-pencil"><Pencil size={22}/></span></div>
    <div className="study-orbit-track orbit-track-three"><span className="orbit-satellite satellite-science"><Atom size={23}/></span></div>
    <div className="study-orbit-track orbit-track-four"><span className="orbit-satellite satellite-ruler"><Ruler size={21}/></span></div>
    <GraduationCap className="orbit-graduation" size={28}/>
  </div>;
}
