import {Leaf,MoveUpRight,Send,Sparkles} from "lucide-react";
import "@/app/learning-scenes.css";

export function LearningTrail(){
 return <div className="learning-trail" aria-hidden="true" data-public-loop><svg className="flight-trace" viewBox="0 0 175 100"><path d="M 18 74 C 34 98 77 75 91 51 S 135 19 156 18"/></svg><Send className="flight-plane" size={24}/><Sparkles className="flight-spark" size={19}/><MoveUpRight className="flight-direction" size={18}/></div>;
}

export function DiscoveryDesk(){
 return <div className="discovery-desk" aria-hidden="true" data-public-loop><div className="discovery-paper"><span className="specimen-label">کشف، تجربه، یادگیری</span><div className="specimen-grid"><Leaf size={88} strokeWidth={1.25}/><i/><i/></div><div className="specimen-notes"><i/><i/><i/></div></div><div className="discovery-lens"><span/></div><div className="discovery-pencil"><i/></div><span className="desk-tape"/></div>;
}
