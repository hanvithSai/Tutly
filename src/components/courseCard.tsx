'use client'
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IoMdBookmarks, IoMdCloseCircle } from "react-icons/io";
import { TiEdit } from "react-icons/ti";
import { MdDelete } from "react-icons/md";
import axios from "axios";
import toast from "react-hot-toast";
import { useState } from "react";
import { MdOutlineEdit } from "react-icons/md";


export default function CourseCard({ course,currentUser }: any) {
    const router = useRouter();
    const [openPopup, setOpenPopup] = useState<boolean>(false);
    const [courseTitle, setCourseTitle] = useState<string>(course.title);
    const [img, setImg] = useState<string>(course.image);
    const [isPublished, setIsPublished] = useState<boolean>(course.isPublished);
    const [text, setText] = useState<string>("Modify");

    const handleEditCourse = async (id: string) => {
        try{
            const res = await axios.put(`/api/course/edit`,{
                id : id,
                title:courseTitle,
                isPublished:isPublished,
                image : img
            })
            
            
            if (res.data.error || res.data.error === "Failed to add new Class" || res.data === null) {
                toast.error("Failed to edit course");
            }
            else{
                toast.success("Course edited successfully");
                setOpenPopup(!openPopup);
                setText("Edit");
                setCourseTitle(res.data.title);
                setImg(res.data.image);
                setIsPublished(res.data.isPublished);
            }
            router.refresh()
        }catch(e){
            toast.error("Failed to edit course");
            setText("Edit");
            setCourseTitle(course.title);
            setImg(course.image);
            setIsPublished(course.isPublished);
            setOpenPopup(!openPopup);
            router.refresh()
        }
    }

    
    return (    
        <div hidden={!course.isPublished && currentUser?.role !== 'INSTRUCTOR' } key={course.id} className="rounded-lg border m-3 w-full sm:w-[280px]" style={{boxShadow: "rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px"}}>
            <div className="h-[150px]  relative text-secondary-700 bg-white rounded-t-lg cursor-pointer" onClick={() => router.push(`/courses/${course.id}`) }>
                <div className="h-full w-full relative">
                    {course && course.image && (
                        <Image 
                            src={course.image} 
                            alt="course image" 
                            layout="fill" 
                            className="rounded-t-lg"
                            objectFit="cover"  
                        />
                    )}
                    {
                        !course.image && (
                            <Image 
                                src="https://i.postimg.cc/CMGSNVsg/new-course-colorful-label-sign-template-new-course-symbol-web-banner-vector.jpg" 
                                alt="Default Image" 
                                layout="fill" 
                                className="rounded-t-lg"
                                objectFit="cover"
                                />
                        )
                    }
                    <div>
                        {
                            course.isPublished === false && currentUser?.role === 'INSTRUCTOR' && (
                                <div className="absolute top-0 right-0 m-3 text-xs flex border border-zinc-950 items-center text-secondary-50 bg-red-500 p-1 rounded-md">
                                    <h1 className="text-xs font-medium">Draft</h1>
                                </div>
                            )
                        }
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 m-3 text-xs flex items-center text-secondary-50 border border-zinc-950 bg-blue-500 p-1 rounded-md">
                    <IoMdBookmarks className="mr-1"/>
                    <h1 className="text-xs font-medium">{course._count.classes} Classes</h1>
                </div>
            </div>
            <div className="h-[50px] border-t flex justify-between px-2 items-center">
                <div onClick={() => router.push(`/courses/${course.id}`) } className=" cursor-pointer" > 
                    <h1 className="text-sm">{course?.title}</h1>
                </div>
                <button hidden ={ currentUser.role !== 'INSTRUCTOR' } onClick={()=>setOpenPopup(true)}>
                    <MdOutlineEdit className=" w-5 h-5 cursor-pointer"  />
                </button>
            </div>
                {
                openPopup
                    && (
                <div className="absolute z-50 top-[150px] left-[40%] min-w-[400px] space-y-5 bg-black p-4 rounded-lg">
                    <div
                        onClick={() => setOpenPopup(!openPopup)}
                        className="absolute right-2 top-2 cursor-pointer text-md"
                    >
                        <IoMdCloseCircle className="h-7 w-7"/>
                    </div>
                <div className="mb-4">
                    <h1 className="text-md text-center my-4">ADD NEW COURSE</h1>
                    <input
                    onChange={(e) => setCourseTitle(e.target.value)}
                    value={courseTitle}
                    type="text"
                    className="rounded p-2 bg-background block m-auto w-full mb-4"
                    placeholder="Title"
                    />
                </div>
                <label className="" htmlFor="publish">Publish:</label>
                    <div className=" space-x-5 flex items-center">
                        <div className=" flex justify-start items-center">
                        <input
                            type="radio"
                            id="yes"
                            name="publish"
                            // value={isPublished.toString()}
                            checked={isPublished === true}
                            className=" w-4 h-4 mr-1"
                            onChange={(e) => setIsPublished(e.target.value === 'true')}
                            />
                        <label htmlFor="yes">Yes</label>
                        </div>
                        <div className=" flex justify-start items-center">
                        <input
                            type="radio"
                            id="no"
                            name="publish"
                            // value={isPublished.toString()}
                            checked={isPublished === false}
                            className=" w-4 h-4 mr-1"
                            onChange={(e) => setIsPublished(e.target.value === 'true')}
                            />
                        <label htmlFor="no" className=" text-lg">No</label>
                        </div>
                    </div>
                <input
                    value={img ? img : '' }
                    onChange={(e) => setImg(e.target.value)}
                    type="text"
                    className="rounded p-2 bg-background block m-auto w-full"
                    placeholder="Paste image link here"
                />
                <button
                    disabled={text === "Modify..."}
                    onClick={()=>{handleEditCourse(course.id);setText("Modifying...") }}
                    className="rounded-md flex justify-center items-center disabled:bg-secondary-800 disabled:cursor-not-allowed bg-primary-500 hover:bg-primary-600 p-2  my-3 w-full"
                >
                    {text}
                    
                </button>
                </div>
            )}
        </div>
    )
}
