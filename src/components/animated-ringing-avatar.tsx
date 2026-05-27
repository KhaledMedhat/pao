import { SHORT_LOGO_URL } from "~/constants/constants";
import { getInitialsFallback } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const AnimatedRingingAvatar = ({ isConnected = true, profilePicture, profilePictureBannerColor, displayName }: { isConnected?: boolean, profilePicture: string | undefined, profilePictureBannerColor: string | undefined, displayName: string }) => {
    return (
        <div className="relative flex items-center justify-center">
            {/* Ring 1 - Middle */}
            <div
                className="absolute rounded-full border-2 border-foreground/60 animate-ping"
                style={{
                    width: 75,
                    height: 75,
                    animationDuration: "2s",
                    animationDelay: "0s",
                }}
            />

            {/* Ring 2 - Inner */}
            <div
                className="absolute rounded-full border-2 border-foreground animate-ping"
                style={{
                    width: 70,
                    height: 70,
                    animationDuration: "2s",
                    animationDelay: "0s",
                }}
            />

            {/* Avatar */}
            <div className="relative">
                <Avatar className={`size-26 ${!isConnected && "brightness-50"}`} style={
                    profilePicture === SHORT_LOGO_URL && profilePictureBannerColor
                        ? { backgroundColor: profilePictureBannerColor }
                        : undefined
                }>
                    <AvatarImage src={profilePicture} />
                    <AvatarFallback>{getInitialsFallback(displayName)}</AvatarFallback>
                </Avatar>
            </div>
        </div>
    )
}

export default AnimatedRingingAvatar;