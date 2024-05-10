import { useOwnedPackageInfoObjects } from "@/hooks/useOwnedPackageInfoObjects";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export function Packages () {
    const { data: packageInfos } = useOwnedPackageInfoObjects();
    const navigate = useNavigate();


    const viewPackage = (id: string | undefined) => {
        if (!id) return toast.error("Package not found");
        navigate(`/packages/${id}`);
    }
    return (
        <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                {
                    packageInfos?.data.map(({ data }, index) => {
                        return (
                            <div key={index} onClick={() => viewPackage(data?.objectId)}>
                                <img key={index} src={data?.display?.data?.image_url}
                                className="mx-auto rounded-xl cursor-pointer border-2 border-transparent hover:border-2 hover:border-violet-600" />
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}
