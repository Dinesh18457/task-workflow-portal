# Stage 1: Build the Java application
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY . .
# This builds your project and creates the JAR file
RUN ./mvnw clean package -DskipTests

# Stage 2: Create a lightweight runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# Copy the built JAR from the build stage to the final image
COPY --from=build /app/target/*.jar app.jar
# Expose the port Spring Boot runs on (usually 8080)
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]